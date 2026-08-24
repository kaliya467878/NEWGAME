"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta: meta as never } });
}

export async function suspendUserAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));

  const target = await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await logAudit(staff.id, "USER_SUSPENDED", "User", userId, { phone: target.phone });
  await logActivity("USER_SUSPENDED", `${target.displayName} was suspended`, staff.id, { userId });
  revalidatePath("/admin/users");
}

export async function reactivateUserAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));

  const target = await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await logAudit(staff.id, "USER_REACTIVATED", "User", userId, { phone: target.phone });
  await logActivity("USER_REACTIVATED", `${target.displayName} was reactivated`, staff.id, { userId });
  revalidatePath("/admin/users");
}

export async function toggleHoldWithdrawalsAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));
  const hold = formData.get("hold") === "true";

  const target = await prisma.user.update({ 
    where: { id: userId }, 
    data: { holdWithdrawals: hold } 
  });

  const actionName = hold ? "USER_WITHDRAW_HELD" : "USER_WITHDRAW_RELEASED";
  const logMessage = hold ? `${target.displayName} withdrawals put on hold` : `${target.displayName} withdrawals released`;

  await logAudit(staff.id, actionName, "User", userId, { phone: target.phone });
  await logActivity(actionName, logMessage, staff.id, { userId });
  
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function updateUserWithdrawLimitsAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));
  const dailyWithdrawLimit = Number(formData.get("dailyWithdrawLimit"));
  const maxWithdrawLimit = Number(formData.get("maxWithdrawLimit"));

  if (isNaN(dailyWithdrawLimit) || dailyWithdrawLimit < 0) {
    throw new Error("Invalid daily withdrawal frequency limit");
  }
  if (isNaN(maxWithdrawLimit) || maxWithdrawLimit < 0) {
    throw new Error("Invalid max withdrawal amount limit");
  }

  const target = await prisma.user.update({
    where: { id: userId },
    data: {
      dailyWithdrawLimit,
      maxWithdrawLimit,
    },
  });

  await logAudit(staff.id, "USER_WITHDRAW_LIMITS_UPDATED", "User", userId, {
    phone: target.phone,
    dailyWithdrawLimit,
    maxWithdrawLimit,
  });
  await logActivity(
    "USER_WITHDRAW_LIMITS_UPDATED",
    `Updated withdrawal limits for ${target.displayName}: Daily frequency = ${dailyWithdrawLimit}, Max amount = ${maxWithdrawLimit}`,
    staff.id,
    { userId }
  );

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function toggleBypassRechargeAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));
  const bypass = formData.get("bypass") === "true";

  const target = await prisma.user.update({
    where: { id: userId },
    data: { bypassRechargeCheck: bypass }
  });

  const actionName = bypass ? "USER_BYPASS_RECHARGE_ENABLED" : "USER_BYPASS_RECHARGE_DISABLED";
  const logMessage = bypass 
    ? `${target.displayName} first recharge requirement bypassed` 
    : `${target.displayName} first recharge requirement enforced`;

  await logAudit(staff.id, actionName, "User", userId, { phone: target.phone });
  await logActivity(actionName, logMessage, staff.id, { userId });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function updateUserAdminNoteAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const userId = String(formData.get("userId"));
  const note = String(formData.get("adminNote") ?? "").trim();
  const finalNote = note || null;

  const target = await prisma.user.update({
    where: { id: userId },
    data: { adminNote: finalNote }
  });

  await logAudit(staff.id, "USER_ADMIN_NOTE_UPDATED", "User", userId, { note: finalNote });
  await logActivity("USER_ADMIN_NOTE_UPDATED", `Updated admin note for ${target.displayName}`, staff.id, { userId });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/customer-service");
  revalidatePath("/admin/payouts");
}

export async function deleteWithdrawalAccountAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const accountId = String(formData.get("accountId"));
  const userId = String(formData.get("userId"));

  const account = await prisma.withdrawalAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("Withdrawal account not found");
  }

  await prisma.withdrawalAccount.delete({
    where: { id: accountId }
  });

  let detailString = "";
  if (account.type === "bank") {
    detailString = `Bank: ${account.bankName}, A/C: ${account.bankCardNumber}`;
  } else if (account.type === "upi") {
    detailString = `UPI ID: ${account.upiId}`;
  } else if (account.type === "usdt") {
    detailString = `USDT: ${account.cryptoAddress}`;
  }

  await logAudit(staff.id, "USER_WITHDRAW_ACCOUNT_DELETED", "User", userId, { 
    accountId, 
    type: account.type, 
    details: detailString 
  });
  await logActivity("USER_WITHDRAW_ACCOUNT_DELETED", `Deleted bound ${account.type.toUpperCase()} card/account (${detailString})`, staff.id, { userId });

  revalidatePath(`/admin/users/${userId}`);
}
