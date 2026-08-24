"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";
import type { AdminActionState } from "@/lib/actions/admin";

const channelSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["CHANNEL", "METHOD"]),
  channelKey: z.string().trim().min(1),
  iconKey: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  label: z.string().trim().min(1, "Label is required"),
  detail: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  channelType: z.string().trim().min(1, "Channel type is required"),
  minAmount: z.coerce.number().int().min(0),
  maxAmount: z.coerce.number().int().min(1),
  bonusBadge: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  networkLabel: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  disabledMessage: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  sortOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean().default(false),
});

export async function saveDepositChannelAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("wallet.approve");

  const file = formData.get("iconFile") as File | null;
  let iconKey = (formData.get("iconKey") as string || "").trim();

  if (file && file.size > 0) {
    try {
      const { uploadImage } = await import("@/lib/storage/supabase");
      const extension = file.name.split(".").pop() || "png";
      const uploadedUrl = await uploadImage(await file.arrayBuffer(), file.type, extension);
      iconKey = uploadedUrl;
    } catch (err: any) {
      return { error: "Failed to upload logo image: " + err.message };
    }
  }

  const parsed = channelSchema.safeParse({
    id: formData.get("id") || undefined,
    kind: formData.get("kind"),
    channelKey: formData.get("channelKey"),
    iconKey: iconKey || undefined,
    label: formData.get("label"),
    detail: formData.get("detail"),
    channelType: formData.get("channelType"),
    minAmount: formData.get("minAmount"),
    maxAmount: formData.get("maxAmount"),
    bonusBadge: formData.get("bonusBadge"),
    networkLabel: formData.get("networkLabel"),
    disabledMessage: formData.get("disabledMessage"),
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { id, ...data } = parsed.data;

  if (id) {
    await prisma.depositChannel.update({ where: { id }, data });
    await logActivity("DEPOSIT_CHANNEL_UPDATED", `Deposit channel "${data.label}" updated`, staff.id, { id });
  } else {
    const created = await prisma.depositChannel.create({ data });
    await logActivity("DEPOSIT_CHANNEL_CREATED", `Deposit channel "${data.label}" created`, staff.id, { id: created.id });
  }

  revalidatePath("/admin/deposit-channels");
  revalidatePath("/wallet");
  return { success: "Saved." };
}

export async function deleteDepositChannelAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));
  const channel = await prisma.depositChannel.delete({ where: { id } });
  await logActivity("DEPOSIT_CHANNEL_DELETED", `Deposit channel "${channel.label}" deleted`, staff.id, { id });
  revalidatePath("/admin/deposit-channels");
  revalidatePath("/wallet");
}

const fallbackSchema = z.object({ message: z.string().trim().min(1) });

export async function saveDepositFallbackMessageAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("wallet.approve");
  const parsed = fallbackSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) return { error: "Message is required" };

  await prisma.setting.upsert({
    where: { key: "depositChannelsFallbackMessage" },
    update: { value: parsed.data.message },
    create: { key: "depositChannelsFallbackMessage", value: parsed.data.message },
  });
  await logActivity("DEPOSIT_FALLBACK_MESSAGE_CHANGED", "Deposit fallback message updated", staff.id);
  revalidatePath("/admin/deposit-channels");
  revalidatePath("/wallet");
  return { success: "Saved." };
}

export async function updateDepositChannelsOrderAction(ids: string[]) {
  const staff = await assertPermission("wallet.approve");
  
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.depositChannel.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/admin/deposit-channels");
  revalidatePath("/wallet");
}

export async function saveDepositMaintenanceModeAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("wallet.approve");
  const enabled = formData.get("enabled") === "true" ? "true" : "false";
  const message = (formData.get("message") as string || "").trim();

  await prisma.setting.upsert({
    where: { key: "depositMaintenanceMode" },
    update: { value: enabled },
    create: { key: "depositMaintenanceMode", value: enabled },
  });

  await prisma.setting.upsert({
    where: { key: "depositMaintenanceMessage" },
    update: { value: message },
    create: { key: "depositMaintenanceMessage", value: message },
  });

  await logActivity("DEPOSIT_MAINTENANCE_TOGGLED", `Deposit maintenance toggled to ${enabled}`, staff.id);
  revalidatePath("/admin/deposit-channels");
  revalidatePath("/wallet");
  return { success: "Saved." };
}
