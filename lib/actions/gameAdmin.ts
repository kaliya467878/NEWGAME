"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";
import { getRoundWindow as k3Window, getRoundNumber as k3RoundNumber } from "@/lib/k3/rounds";
import { getRoundWindow as fivedWindow, getRoundNumber as fivedRoundNumber } from "@/lib/fived/rounds";
import { uploadImage } from "@/lib/storage/supabase";
import { ART_SLOTS, gameArtSettingKey } from "@/lib/gameArt";
import type { AdminActionState } from "@/lib/actions/admin";

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, meta: meta as Prisma.InputJsonValue | undefined },
  });
}

/* ------------------------------ K3 overrides ------------------------------ */

const k3OverrideSchema = z.object({
  mode: z.enum(["S30", "M1", "M3", "M5", "M10"]),
  roundNumber: z.coerce.number().int().positive(),
  dice1: z.coerce.number().int().min(1).max(6),
  dice2: z.coerce.number().int().min(1).max(6),
  dice3: z.coerce.number().int().min(1).max(6),
});

export async function setK3OverrideAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");

  const parsed = k3OverrideSchema.safeParse({
    mode: formData.get("mode"),
    roundNumber: formData.get("roundNumber"),
    dice1: formData.get("dice1"),
    dice2: formData.get("dice2"),
    dice3: formData.get("dice3"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { mode, roundNumber, dice1, dice2, dice3 } = parsed.data;

  // Resolve suffix lookup (last 3 digits)
  let resolvedRoundNumber = BigInt(roundNumber);
  if (roundNumber < 100000) {
    const currentRound = k3RoundNumber(mode);
    const candidates = [
      currentRound,
      currentRound + BigInt(1),
      currentRound + BigInt(2),
      currentRound + BigInt(3),
      currentRound - BigInt(1),
      currentRound - BigInt(2),
    ];
    for (const c of candidates) {
      if (Number(c % BigInt(1000)) === roundNumber) {
        resolvedRoundNumber = c;
        break;
      }
    }
  }

  if (Date.now() >= k3Window(mode, resolvedRoundNumber).endsAt) return { error: "That round has already ended" };

  const settled = await prisma.k3Result.findUnique({ where: { mode_roundNumber: { mode, roundNumber: resolvedRoundNumber } } });
  if (settled) return { error: "That round has already settled" };

  await prisma.k3ResultOverride.create({ data: { mode, roundNumber: resolvedRoundNumber, dice1, dice2, dice3, createdById: staff.id } });
  await logAudit(staff.id, "K3_OVERRIDE_SET", "K3ResultOverride", `${mode}:${resolvedRoundNumber}`, { dice1, dice2, dice3 });
  await logActivity("RESULT_OVERRIDE_SET", `K3 override: ${mode} round #${resolvedRoundNumber} → ${dice1}-${dice2}-${dice3}`, staff.id);
  revalidatePath("/admin/results");
  return { success: `K3 round #${resolvedRoundNumber} (${mode}) will settle as ${dice1}-${dice2}-${dice3} (sum ${dice1 + dice2 + dice3})` };
}

/* ------------------------------ 5D overrides ------------------------------ */

const fivedOverrideSchema = z.object({
  mode: z.enum(["S30", "M1", "M3", "M5", "M10"]),
  roundNumber: z.coerce.number().int().positive(),
  a: z.coerce.number().int().min(0).max(9),
  b: z.coerce.number().int().min(0).max(9),
  c: z.coerce.number().int().min(0).max(9),
  d: z.coerce.number().int().min(0).max(9),
  e: z.coerce.number().int().min(0).max(9),
});

export async function setFiveDOverrideAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");

  const parsed = fivedOverrideSchema.safeParse({
    mode: formData.get("mode"),
    roundNumber: formData.get("roundNumber"),
    a: formData.get("a"),
    b: formData.get("b"),
    c: formData.get("c"),
    d: formData.get("d"),
    e: formData.get("e"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { mode, roundNumber, a, b, c, d, e } = parsed.data;

  // Resolve suffix lookup (last 3 digits)
  let resolvedRoundNumber = BigInt(roundNumber);
  if (roundNumber < 100000) {
    const currentRound = fivedRoundNumber(mode);
    const candidates = [
      currentRound,
      currentRound + BigInt(1),
      currentRound + BigInt(2),
      currentRound + BigInt(3),
      currentRound - BigInt(1),
      currentRound - BigInt(2),
    ];
    for (const c of candidates) {
      if (Number(c % BigInt(1000)) === roundNumber) {
        resolvedRoundNumber = c;
        break;
      }
    }
  }

  if (Date.now() >= fivedWindow(mode, resolvedRoundNumber).endsAt) return { error: "That round has already ended" };

  const settled = await prisma.fiveDResult.findUnique({ where: { mode_roundNumber: { mode, roundNumber: resolvedRoundNumber } } });
  if (settled) return { error: "That round has already settled" };

  await prisma.fiveDResultOverride.create({ data: { mode, roundNumber: resolvedRoundNumber, a, b, c, d, e, createdById: staff.id } });
  await logAudit(staff.id, "FIVED_OVERRIDE_SET", "FiveDResultOverride", `${mode}:${resolvedRoundNumber}`, { a, b, c, d, e });
  await logActivity("RESULT_OVERRIDE_SET", `5D override: ${mode} round #${resolvedRoundNumber} → ${a}${b}${c}${d}${e}`, staff.id);
  revalidatePath("/admin/results");
  return { success: `5D round #${resolvedRoundNumber} (${mode}) will settle as ${a}${b}${c}${d}${e}` };
}

/* ------------------------------- game art -------------------------------- */

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function saveGameArtAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("cms.manage");

  const slot = String(formData.get("slot") ?? "");
  if (!ART_SLOTS.some((s) => s.key === slot)) return { error: "Unknown art slot" };

  const file = formData.get("file");
  let url = String(formData.get("url") ?? "").trim();

  if (file instanceof File && file.size > 0) {
    const extension = IMAGE_TYPES[file.type];
    if (!extension) return { error: "Only JPG, PNG, WebP or GIF images are allowed" };
    if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be 4MB or smaller" };
    try {
      url = await uploadImage(await file.arrayBuffer(), file.type, extension);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Upload failed" };
    }
  }

  if (!url) return { error: "Choose an image file or paste a URL" };

  await prisma.setting.upsert({
    where: { key: gameArtSettingKey(slot) },
    update: { value: url },
    create: { key: gameArtSettingKey(slot), value: url },
  });

  await logAudit(staff.id, "GAME_ART_CHANGED", "Setting", gameArtSettingKey(slot), { url });
  revalidatePath("/admin/game-assets");
  revalidatePath("/dashboard");
  revalidatePath("/games");
  return { success: "Image saved — it is live on the site now." };
}

export async function resetGameArtAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("cms.manage");

  const slot = String(formData.get("slot") ?? "");
  if (!ART_SLOTS.some((s) => s.key === slot)) return { error: "Unknown art slot" };

  await prisma.setting.deleteMany({ where: { key: gameArtSettingKey(slot) } });
  await logAudit(staff.id, "GAME_ART_RESET", "Setting", gameArtSettingKey(slot));
  revalidatePath("/admin/game-assets");
  revalidatePath("/dashboard");
  revalidatePath("/games");
  return { success: "Reverted to the default artwork." };
}

export async function deleteWingoOverrideAction(id: string): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");
  try {
    const target = await prisma.resultOverride.delete({ where: { id } });
    await logAudit(staff.id, "RESULT_OVERRIDE_DELETED", "ResultOverride", target.id, { mode: target.mode, roundNumber: target.roundNumber.toString() });
    await logActivity("RESULT_OVERRIDE_DELETED", `Cancelled Wingo override: ${target.mode} round #${target.roundNumber}`, staff.id);
    revalidatePath("/admin/results");
    return { success: "Wingo override cancelled successfully!" };
  } catch (err: any) {
    return { error: err.message || "Failed to cancel Wingo override" };
  }
}

export async function deleteK3OverrideAction(id: string): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");
  try {
    const target = await prisma.k3ResultOverride.delete({ where: { id } });
    await logAudit(staff.id, "K3_OVERRIDE_DELETED", "K3ResultOverride", target.id, { mode: target.mode, roundNumber: target.roundNumber.toString() });
    await logActivity("RESULT_OVERRIDE_DELETED", `Cancelled K3 override: ${target.mode} round #${target.roundNumber}`, staff.id);
    revalidatePath("/admin/results");
    return { success: "K3 override cancelled successfully!" };
  } catch (err: any) {
    return { error: err.message || "Failed to cancel K3 override" };
  }
}

export async function deleteFiveDOverrideAction(id: string): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");
  try {
    const target = await prisma.fiveDResultOverride.delete({ where: { id } });
    await logAudit(staff.id, "FIVED_OVERRIDE_DELETED", "FiveDResultOverride", target.id, { mode: target.mode, roundNumber: target.roundNumber.toString() });
    await logActivity("RESULT_OVERRIDE_DELETED", `Cancelled 5D override: ${target.mode} round #${target.roundNumber}`, staff.id);
    revalidatePath("/admin/results");
    return { success: "5D override cancelled successfully!" };
  } catch (err: any) {
    return { error: err.message || "Failed to cancel 5D override" };
  }
}
