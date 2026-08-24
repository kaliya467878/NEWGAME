"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";
import type { AdminActionState } from "@/lib/actions/admin";

const inviteAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789", 8);

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta: meta as never } });
}

const agentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  mobile: z.string().trim().min(7, "Enter a valid mobile number"),
  type: z.enum(["MASTER_AGENT", "SUB_AGENT", "REFERRAL_AGENT", "DIRECT_AFFILIATE"]),
  parentId: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  commissionPct: z.coerce.number().min(0).max(100),
  notes: z.string().trim().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function saveAgentAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("agents.manage");

  const parsed = agentSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    type: formData.get("type"),
    parentId: formData.get("parentId"),
    commissionPct: formData.get("commissionPct"),
    notes: formData.get("notes"),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { id, ...data } = parsed.data;

  if (id && data.parentId === id) return { error: "An agent cannot be its own parent" };

  if (id) {
    await prisma.agent.update({ where: { id }, data });
    await logActivity("AGENT_UPDATED", `Agent "${data.name}" updated`, staff.id, { id });
    await logAudit(staff.id, "AGENT_UPDATED", "Agent", id);
  } else {
    let inviteCode = inviteAlphabet();
    // Extremely unlikely collision, but guard anyway.
    while (await prisma.agent.findUnique({ where: { inviteCode } })) inviteCode = inviteAlphabet();

    const created = await prisma.agent.create({ data: { ...data, inviteCode, createdById: staff.id } });
    await logActivity("AGENT_CREATED", `Agent "${data.name}" created (${inviteCode})`, staff.id, { id: created.id });
    await logAudit(staff.id, "AGENT_CREATED", "Agent", created.id, { inviteCode });
  }

  revalidatePath("/admin/agents");
  return { success: "Saved." };
}

export async function toggleAgentStatusAction(formData: FormData) {
  const staff = await assertPermission("agents.manage");
  const id = String(formData.get("id"));
  const makeActive = formData.get("makeActive") === "true";

  const agent = await prisma.agent.update({
    where: { id },
    data: { status: makeActive ? "ACTIVE" : "INACTIVE" },
  });
  await logAudit(staff.id, makeActive ? "AGENT_ACTIVATED" : "AGENT_DEACTIVATED", "Agent", id);
  await logActivity(makeActive ? "AGENT_ACTIVATED" : "AGENT_DEACTIVATED", `Agent "${agent.name}" ${makeActive ? "activated" : "deactivated"}`, staff.id);
  revalidatePath("/admin/agents");
}
