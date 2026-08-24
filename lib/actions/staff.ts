"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { assertPermission, PERMISSION_CATALOG, type PermissionKey } from "@/lib/admin/permissions";
import { generateDisplayName, generateAvatarSeed, generateReferralCode } from "@/lib/auth/identity";
import { logActivity } from "@/lib/admin/activity";
import type { AdminActionState } from "@/lib/actions/admin";

const VALID_KEYS = new Set<string>(PERMISSION_CATALOG.map((p) => p.key));

function isValidKey(k: string): k is PermissionKey {
  return VALID_KEYS.has(k);
}

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta: meta as never } });
}

const createStaffSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export async function createStaffAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await assertPermission("staff.manage");
  const parsed = createStaffSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) return { error: "A user with that mobile number already exists" };

  if (parsed.data.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingEmail) return { error: "A user with that email already exists" };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const staff = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        phone: parsed.data.phone,
        email: parsed.data.email,
        passwordHash,
        role: "STAFF",
        displayName: generateDisplayName(),
        avatarSeed: generateAvatarSeed(),
        referralCode: generateReferralCode(),
      },
    });
    await tx.wallet.create({ data: { userId: created.id, balance: 0 } });
    return created;
  });

  await logAudit(actor.id, "STAFF_CREATED", "User", staff.id, { phone: parsed.data.phone });
  await logActivity("STAFF_CREATED", `New staff account created (${staff.displayName})`, actor.id);
  revalidatePath("/admin/staff");
  return { success: `Staff account created for ${parsed.data.phone}.` };
}

export async function setStaffPermissionsAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await assertPermission("staff.manage");
  const userId = String(formData.get("userId"));

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STAFF") return { error: "Not a staff account" };

  const selectedKeys = formData.getAll("permissions").map(String).filter(isValidKey);

  await prisma.$transaction(async (tx) => {
    await tx.staffPermission.deleteMany({ where: { userId } });
    if (selectedKeys.length > 0) {
      await tx.staffPermission.createMany({
        data: selectedKeys.map((key) => ({ userId, key, grantedById: actor.id })),
      });
    }
  });

  await logAudit(actor.id, "STAFF_PERMISSIONS_UPDATED", "User", userId, { permissions: selectedKeys });
  await logActivity("STAFF_PERMISSIONS_UPDATED", `Permissions updated for ${target.displayName}`, actor.id);
  revalidatePath("/admin/staff");
  return { success: `Permissions updated (${selectedKeys.length} granted).` };
}

/**
 * Removes a staff account's admin access. This can't be a hard row delete —
 * the account may have created audit logs, CMS content, gift codes, etc.
 * that reference it by foreign key — so instead it revokes the STAFF role,
 * wipes all granted permissions, and invalidates the password so the
 * account can no longer sign in anywhere, admin or otherwise.
 */
export async function deleteStaffAction(formData: FormData) {
  const actor = await assertPermission("staff.manage");
  const userId = String(formData.get("userId"));

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STAFF") return;

  const lockedPasswordHash = await hashPassword(randomBytes(24).toString("hex"));

  await prisma.$transaction(async (tx) => {
    await tx.staffPermission.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { role: "USER", passwordHash: lockedPasswordHash } });
  });

  await logAudit(actor.id, "STAFF_DELETED", "User", userId, { displayName: target.displayName, phone: target.phone });
  await logActivity("STAFF_DELETED", `Staff account removed (${target.displayName})`, actor.id);
  revalidatePath("/admin/staff");
}
