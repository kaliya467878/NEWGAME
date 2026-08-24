"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { customAlphabet } from "nanoid";
import type { Prisma, WingoMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession, createAdminSession, getCurrentUser } from "@/lib/auth/session";
import { getAdminPathPrefix } from "@/lib/admin/path";
import { getRoundWindow, getRoundNumber } from "@/lib/wingo/rounds";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";
import { createNotification } from "@/lib/notifications";
import { assertPermission } from "@/lib/admin/permissions";
import { logActivity } from "@/lib/admin/activity";
import { formatAmount } from "@/lib/format";
import { getBonusSettings, saveBonusSettings, DEFAULT_BONUS_SETTINGS, type BonusSettings, getFirstDepositBonus } from "@/lib/settings/bonuses";
import { headers } from "next/headers";
import { createSunpaysPayout } from "@/lib/sunpays";
import { getServerActionBaseUrl } from "@/lib/url";

const giftCodeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

export type AdminActionState = { error?: string; success?: string };

async function logAudit(actorId: string, action: string, targetType: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, meta: meta as Prisma.InputJsonValue | undefined },
  });
}

const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your mobile number or email"),
  password: z.string().min(1, "Enter your password"),
});

export async function adminLoginAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const parsed = adminLoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { identifier, password } = parsed.data;
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findUnique({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });

  if (!user || (user.role !== "STAFF" && user.role !== "SUPER_ADMIN")) {
    return { error: "Invalid credentials" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid credentials" };
  }

  await createAdminSession(user.id);
  await logAudit(user.id, "STAFF_LOGIN", "User", user.id);
  redirect(getAdminPathPrefix());
}

export async function approveDepositAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));
  const isMock = formData.get("isMock") === "true";
  const customAmountRaw = formData.get("customAmount");

  const deposit = await prisma.depositRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!deposit || deposit.status !== "PENDING") return;

  let amountToApprove = deposit.amount;
  if (customAmountRaw) {
    const parsedCustom = Number(customAmountRaw);
    if (!isNaN(parsedCustom) && parsedCustom > 0) {
      amountToApprove = parsedCustom;
    }
  }

  const { depositBonusPercent } = await getBonusSettings();

  // Check if this is the user's first approved deposit
  const previousApprovedCount = await prisma.depositRequest.count({
    where: {
      userId: deposit.userId,
      status: "APPROVED",
      id: { not: id }
    }
  });
  const isFirstDeposit = previousApprovedCount === 0;

  let bonusAmount = 0;
  if (isFirstDeposit) {
    bonusAmount = getFirstDepositBonus(amountToApprove, deposit.note);
  } else {
    bonusAmount = Math.floor((amountToApprove * depositBonusPercent) / 100);
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId: deposit.userId },
      data: { balance: { increment: amountToApprove + bonusAmount } },
    });
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT_APPROVED",
        amount: amountToApprove,
        balanceAfter: wallet.balance - bonusAmount,
        meta: { depositId: id, isMock, originalAmount: deposit.amount },
      },
    });
    if (bonusAmount > 0) {
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT_BONUS",
          amount: bonusAmount,
          balanceAfter: wallet.balance,
          meta: { depositId: id, percent: depositBonusPercent, isMock },
        },
      });
    }
    await tx.depositRequest.update({
      where: { id },
      data: { status: "APPROVED", isMock, reviewedById: staff.id, reviewedAt: new Date(), amount: amountToApprove },
    });
  });

  const bonusSuffix = bonusAmount > 0 ? ` (+${formatAmount(bonusAmount)} bonus)` : "";
  await logAudit(staff.id, "DEPOSIT_APPROVED", "DepositRequest", id, { amount: amountToApprove, bonusAmount, userId: deposit.userId, isMock, originalAmount: deposit.amount });
  await logActivity("DEPOSIT_APPROVED", `Deposit of ${formatAmount(amountToApprove)}${bonusSuffix} approved${isMock ? " (Mock)" : ""}`, staff.id, { depositId: id });
  await createNotification(
    deposit.userId,
    "DEPOSIT_APPROVED",
    "Deposit approved",
    `Your deposit of ${formatAmount(amountToApprove)}${bonusSuffix} has been approved.`,
    { depositId: id }
  );
  await checkAndAwardReferralReward(deposit.userId, amountToApprove, deposit.id);

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(deposit.note || "{}");
  } catch {}

  const mode = (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("usdt") || (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("trc20") || (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("bep20") ? "Usdt(deposit channel)" : "Upi(deposit channel)";

  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      deposit.user.uid,
      amountToApprove,
      mode,
      deposit.id,
      "success",
      new Date(),
      noteDetails.txid || "N/A",
      noteDetails.telegramMessageId,
      isMock,
      staff.displayName
    );
  } catch (err) {
    console.error("Failed to send manual approval Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
}

export async function rejectDepositAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));
  const remarks = String(formData.get("remarks") || "").trim();
  const deposit = await prisma.depositRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!deposit || deposit.status !== "PENDING") return;

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(deposit.note || "{}");
  } catch {}

  if (remarks) {
    noteDetails.rejectReason = remarks;
  }

  await prisma.depositRequest.update({
    where: { id },
    data: { 
      status: "REJECTED", 
      reviewedById: staff.id, 
      reviewedAt: new Date(),
      note: JSON.stringify(noteDetails)
    },
  });
  await logAudit(staff.id, "DEPOSIT_REJECTED", "DepositRequest", id, { amount: deposit.amount, userId: deposit.userId, remarks });
  await logActivity("DEPOSIT_REJECTED", `Deposit of ${formatAmount(deposit.amount)} rejected: ${remarks}`, staff.id, { depositId: id });
  try {
    noteDetails = JSON.parse(deposit.note || "{}");
  } catch {}

  const mode = (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("usdt") || (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("trc20") || (noteDetails.payCurrency || noteDetails.manualChannelLabel || "").toLowerCase().includes("bep20") ? "Usdt(deposit channel)" : "Upi(deposit channel)";

  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      deposit.user.uid,
      deposit.amount,
      mode,
      deposit.id,
      "failed",
      new Date(),
      noteDetails.txid || "N/A",
      noteDetails.telegramMessageId,
      deposit.isMock,
      staff.displayName
    );
  } catch (err) {
    console.error("Failed to send manual rejection Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
}

export async function undoDepositAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));

  const deposit = await prisma.depositRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!deposit || (deposit.status !== "APPROVED" && deposit.status !== "REJECTED")) {
    throw new Error("Only approved or rejected deposits can be undone.");
  }

  const previousStatus = deposit.status;

  await prisma.$transaction(async (tx) => {
    if (previousStatus === "APPROVED") {
      const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
      if (wallet) {
        // Query ledger entries for this user wallet
        const ledgerEntries = await tx.ledgerEntry.findMany({
          where: {
            walletId: wallet.id,
            type: { in: ["DEPOSIT_APPROVED", "DEPOSIT_BONUS"] }
          }
        });
        
        // Filter in-memory to find exact entries for this deposit request
        const relatedEntries = ledgerEntries.filter(entry => {
          try {
            const meta = entry.meta as any;
            return meta && meta.depositId === id;
          } catch {
            return false;
          }
        });

        const totalToSubtract = relatedEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

        const newBalance = Math.max(0, wallet.balance - totalToSubtract);
        await tx.wallet.update({
          where: { userId: deposit.userId },
          data: { balance: newBalance },
        });

        // Delete the matching ledger entries
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: relatedEntries.map(e => e.id) }
          }
        });
      }
    }

    await tx.depositRequest.update({
      where: { id },
      data: {
        status: "PENDING",
        reviewedById: null,
        reviewedAt: null,
      },
    });
  });

  await logAudit(staff.id, "DEPOSIT_UNDO", "DepositRequest", id, { amount: deposit.amount, userId: deposit.userId, previousStatus });
  await logActivity("DEPOSIT_UNDO", `Undone deposit action of ${formatAmount(deposit.amount)} (was ${previousStatus})`, staff.id, { depositId: id });

  const adminPrefix = getAdminPathPrefix();
  revalidatePath(`${adminPrefix}/wallet`);
}

export async function approveWithdrawAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));
  const isMock = formData.get("isMock") === "true";

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!withdraw || withdraw.status !== "PENDING") return;

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  const updatedNote = isMock ? JSON.stringify({
    ...noteDetails,
    gateway: "mock",
    gatewayStatus: "success",
    transactionId: `mock-${withdraw.id}`,
    submittedAt: new Date().toISOString(),
  }) : withdraw.note;

  await prisma.withdrawRequest.update({
    where: { id },
    data: { 
      status: "APPROVED", 
      isMock, 
      reviewedById: staff.id, 
      reviewedAt: new Date(),
      note: updatedNote
    },
  });

  await logAudit(staff.id, "WITHDRAW_APPROVED", "WithdrawRequest", id, { amount: withdraw.amount, userId: withdraw.userId, isMock });
  await logActivity("WITHDRAW_APPROVED", `Withdrawal of ${formatAmount(withdraw.amount)} approved${isMock ? " (Mock)" : ""}`, staff.id, { withdrawId: id });
  await createNotification(
    withdraw.userId,
    "WITHDRAW_APPROVED",
    "Withdrawal approved",
    `Your withdrawal of ${formatAmount(withdraw.amount)} has been approved.`,
    { withdrawId: id }
  );

  if (isMock) {
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      await sendTelegramNotification(
        withdraw.user.uid,
        withdraw.amount,
        "Withdrawal",
        withdraw.id,
        "mock",
        new Date(),
        `mock-${withdraw.id}`,
        noteDetails.telegramMessageId,
        true,
        staff.displayName
      );
    } catch (err) {
      console.error("Failed to send mock Telegram notification from approval:", err);
    }
  } else {
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      await sendTelegramNotification(
        withdraw.user.uid,
        withdraw.amount,
        "Withdrawal",
        withdraw.id,
        "approved",
        new Date(),
        "N/A",
        noteDetails.telegramMessageId,
        false,
        staff.displayName
      );
    } catch (err) {
      console.error("Failed to send approved Telegram notification from approval:", err);
    }
  }

  revalidatePath("/admin/wallet");
}

export async function rejectWithdrawAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));
  const remarks = String(formData.get("remarks") || "").trim();
  const wagerAmount = Math.max(0, Number(formData.get("wagerAmount") || 0));

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!withdraw || (withdraw.status !== "PENDING" && withdraw.status !== "APPROVED")) return;

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  if (remarks) {
    noteDetails.failureReason = remarks;
    noteDetails.rejectReason = remarks;
  }

  await prisma.$transaction(async (tx) => {
    // Refund wallet balance
    const wallet = await tx.wallet.update({
      where: { userId: withdraw.userId },
      data: { balance: { increment: withdraw.amount } },
    });

    // Create Ledger Entry for refund
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAW_REJECTED_REFUND",
        amount: withdraw.amount,
        balanceAfter: wallet.balance,
        meta: { withdrawId: id, reason: remarks || "Admin rejected request" },
      },
    });

    // Update status to REJECTED and save note
    await tx.withdrawRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: staff.id,
        reviewedAt: new Date(),
        note: JSON.stringify(noteDetails),
      },
    });

    // Update user requiredWager if wagerAmount > 0
    if (wagerAmount > 0) {
      await tx.user.update({
        where: { id: withdraw.userId },
        data: { requiredWager: { increment: wagerAmount } },
      });
    }
  });

  await logAudit(staff.id, "WITHDRAW_REJECTED", "WithdrawRequest", id, { amount: withdraw.amount, userId: withdraw.userId, remarks, wagerAmount });
  await logActivity("WITHDRAW_REJECTED", `Withdrawal of ${formatAmount(withdraw.amount)} rejected: ${remarks || "balance refunded"}`, staff.id, { withdrawId: id });

  // Send Telegram notification
  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      withdraw.user.uid,
      withdraw.amount,
      "Withdrawal",
      withdraw.id,
      "failed",
      new Date(),
      "N/A",
      noteDetails.telegramMessageId,
      withdraw.isMock,
      staff.displayName
    );
  } catch (err) {
    console.error("Failed to send rejection Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
}

function resolveBankNameFromIfsc(ifsc: string): string {
  if (!ifsc) return "Bank Card";
  const prefix = ifsc.substring(0, 4).toUpperCase();
  const bankNames: Record<string, string> = {
    SBIN: "State Bank of India",
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    BARB: "Bank of Baroda",
    PUNB: "Punjab National Bank",
    UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank",
    YESB: "Yes Bank",
    IDFB: "IDFC First Bank",
    CNRB: "Canara Bank",
    IBKL: "IDBI Bank",
    JAKA: "Jammu & Kashmir Bank",
    MAHB: "Bank of Maharashtra",
    IOBA: "Indian Overseas Bank",
    INDB: "IndusInd Bank",
    JIOP: "Jio Payments Bank",
    PYTM: "Paytm Payments Bank",
    AIRP: "Airtel Payments Bank",
    IPOS: "India Post Payments Bank",
    UBIN: "Union Bank of India",
    ALLA: "Allahabad Bank",
    ANDB: "Andhra Bank",
    SYNB: "Syndicate Bank",
    ORBC: "Oriental Bank of Commerce",
    CORP: "Corporation Bank",
    VIJB: "Vijaya Bank",
    DBSS: "DBS Bank",
    HSBC: "HSBC Bank",
    SCBL: "Standard Chartered Bank",
    CITI: "Citi Bank",
  };
  return bankNames[prefix] || "Bank Card";
}

export async function dispatchSunpaysPayoutAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id"));

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!withdraw || withdraw.status !== "APPROVED") {
    throw new Error("Withdrawal request must be APPROVED to dispatch payout");
  }

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  const method = String(noteDetails.method || "").toLowerCase();
  const accountDetails = noteDetails.accountDetails;

  if (!accountDetails || (method !== "upi" && method !== "bank" && method !== "usdt")) {
    throw new Error("Invalid withdrawal method or account details");
  }

  const headersList = await headers();
  const baseUrl = getServerActionBaseUrl(headersList);
  const payoutNotifyUrl = `${baseUrl}/api/wallet/sunpays-payout-ipn`;

  const beneficiaryAccount = accountDetails.upiId || accountDetails.accountNumber || accountDetails.walletAddress || accountDetails.cryptoAddress || accountDetails.address || "";
  const beneficiaryName = accountDetails.accountName || withdraw.user?.displayName || "Beneficiary";

  // Enforce 5% fee calculation:
  // Net payout = withdraw.amount * 0.95
  const payoutAmount = Math.round(withdraw.amount * 0.95 * 100) / 100;

  let finalBankName = accountDetails.bankName;
  let finalIfsc = accountDetails.ifsc;

  if (method === "bank") {
    if (!finalBankName || !finalIfsc) {
      const dbAccount = await prisma.withdrawalAccount.findFirst({
        where: {
          userId: withdraw.userId,
          type: "bank",
          bankCardNumber: accountDetails.accountNumber,
        },
      });
      if (dbAccount) {
        if (!finalBankName) finalBankName = dbAccount.bankName;
        if (!finalIfsc) finalIfsc = dbAccount.ifsc;
      }
    }
    // Fallback:
    if (!finalBankName) finalBankName = "Bank Card";
  }

  const resolvedBankName = resolveBankNameFromIfsc(finalIfsc || "") || finalBankName || "Bank Card";

  try {
    console.log(`Dispatching Sunpays payout for withdrawal: ${withdraw.id}, Method: ${method}, Gross Amount: ${withdraw.amount}, Net Payout: ${payoutAmount}, Bank: ${resolvedBankName}, IFSC: ${finalIfsc}`);
    
    // Construct clean payout request payload mapping only official API fields
    const payoutPayload: any = {
      payout_id: withdraw.id,
      amount: payoutAmount,
      currency: "INR",
      method: method as "upi" | "bank" | "usdt",
      beneficiary_name: beneficiaryName,
      beneficiary_account: beneficiaryAccount,
    };

    // Only send beneficiary_phone for upi as per Sunpays documentation
    if (method === "upi" && withdraw.user?.phone) {
      payoutPayload.beneficiary_phone = withdraw.user.phone;
    }

    if (method === "bank") {
      payoutPayload.ifsc = finalIfsc || undefined;
      payoutPayload.ifsc_code = finalIfsc || undefined;
      payoutPayload.bank_name = resolvedBankName;
      payoutPayload.metadata = {
        ifsc: finalIfsc || undefined,
        bank_name: resolvedBankName,
        mobile: withdraw.user?.phone || undefined,
        source: "withdrawal"
      };
    }

    if (payoutNotifyUrl) {
      payoutPayload.notify_url = payoutNotifyUrl;
    }

    const payoutResult = await createSunpaysPayout(payoutPayload);
    console.log("Sunpays payout API full response:", JSON.stringify(payoutResult));

     const updatedNote = JSON.stringify({
      ...noteDetails,
      gateway: "sunpays",
      gatewayStatus: "processing",
      transactionId: payoutResult.transaction_id || payoutResult.payout_id || payoutResult.id,
      submittedAt: new Date().toISOString(),
      dispatchedPayload: payoutPayload,
      sunpaysResponse: payoutResult,
    });

    await prisma.withdrawRequest.update({
      where: { id: withdraw.id },
      data: {
        note: updatedNote,
      },
    });

    await logAudit(staff.id, "WITHDRAW_DISPATCHED", "WithdrawRequest", id, { amount: withdraw.amount, netPayout: payoutAmount, userId: withdraw.userId });
    await logActivity("WITHDRAW_DISPATCHED", `Withdrawal of ${formatAmount(withdraw.amount)} (Net: ${formatAmount(payoutAmount)}) dispatched via Sunpay`, staff.id, { withdrawId: id });

    // Send Telegram notification (3rd notification - Sent to Sunpay)
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      await sendTelegramNotification(
        withdraw.user.uid,
        withdraw.amount,
        "Withdrawal",
        withdraw.id,
        "processing",
        new Date(),
        payoutResult.transaction_id || payoutResult.id || "N/A",
        noteDetails.telegramMessageId,
        withdraw.isMock,
        staff.displayName
      );
    } catch (err) {
      console.error("Failed to send payout Telegram notification:", err);
    }
  } catch (error: any) {
    console.error("Sunpays payout dispatch failed:", error);
    const failedNote = JSON.stringify({
      ...noteDetails,
      gateway: "sunpays",
      gatewayStatus: "failed",
      failureReason: error.message,
    });
    await prisma.withdrawRequest.update({
      where: { id: withdraw.id },
      data: { note: failedNote },
    });
    // Do not throw the error to prevent Next.js runtime error boundary crash.
  }

  revalidatePath("/admin/wallet");
  revalidatePath(getAdminPathPrefix() + "/payouts");
  revalidatePath(getAdminPathPrefix() + "/wallet");
}

export async function forceSuccessSunpaysPayoutAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing request ID");

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!withdraw) throw new Error("Withdraw request not found");

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  const updatedNote = JSON.stringify({
    ...noteDetails,
    gateway: "sunpays",
    gatewayStatus: "success",
    forceSuccess: true,
    forceSuccessById: staff.id,
    forceSuccessByName: staff.displayName,
    forceSuccessAt: new Date().toISOString(),
  });

  await prisma.withdrawRequest.update({
    where: { id: withdraw.id },
    data: {
      note: updatedNote,
    },
  });

  const payoutAmount = Math.round(withdraw.amount * 0.95 * 100) / 100;
  await logAudit(staff.id, "WITHDRAW_FORCE_SUCCESS", "WithdrawRequest", id, { amount: withdraw.amount, netPayout: payoutAmount, userId: withdraw.userId });
  await logActivity("WITHDRAW_FORCE_SUCCESS", `Withdrawal of ${formatAmount(withdraw.amount)} (Net: ${formatAmount(payoutAmount)}) marked as SUCCESS manually`, staff.id, { withdrawId: id });

  // Send Telegram notification
  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      withdraw.user.uid,
      withdraw.amount,
      "Withdrawal",
      withdraw.id,
      "success",
      withdraw.createdAt,
      noteDetails.transactionId || "manual",
      noteDetails.telegramMessageId
    );
  } catch (err) {
    console.error("Failed to send payout force success Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
  revalidatePath(getAdminPathPrefix() + "/payouts");
  revalidatePath(getAdminPathPrefix() + "/wallet");
}

export async function forceFailSunpaysPayoutAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id) throw new Error("Missing request ID");

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!withdraw) throw new Error("Withdraw request not found");

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  const updatedNote = JSON.stringify({
    ...noteDetails,
    gateway: "sunpays",
    gatewayStatus: "failed",
    failureReason: reason || "Marked failed manually by admin",
    forceFailedById: staff.id,
    forceFailedByName: staff.displayName,
    forceFailedAt: new Date().toISOString(),
  });

  await prisma.$transaction(async (tx) => {
    // 1. Refund wallet balance
    const wallet = await tx.wallet.update({
      where: { userId: withdraw.userId },
      data: { balance: { increment: withdraw.amount } },
    });

    // 2. Create Ledger Entry for refund
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAW_REJECTED_REFUND",
        amount: withdraw.amount,
        balanceAfter: wallet.balance,
        meta: { withdrawId: id, reason: reason || "Marked failed manually by admin" },
      },
    });

    // 3. Update status to REJECTED and save note
    await tx.withdrawRequest.update({
      where: { id: withdraw.id },
      data: {
        status: "REJECTED",
        reviewedById: staff.id,
        reviewedAt: new Date(),
        note: updatedNote,
      },
    });
  });

  const payoutAmount = Math.round(withdraw.amount * 0.95 * 100) / 100;
  await logAudit(staff.id, "WITHDRAW_FORCE_FAIL", "WithdrawRequest", id, { 
    amount: withdraw.amount, 
    netPayout: payoutAmount, 
    userId: withdraw.userId,
    reason: reason 
  });
  await logActivity("WITHDRAW_FORCE_FAIL", `Withdrawal of ${formatAmount(withdraw.amount)} (Net: ${formatAmount(payoutAmount)}) marked as FAILED manually: ${reason}`, staff.id, { withdrawId: id });

  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      withdraw.user.uid,
      withdraw.amount,
      "Withdrawal",
      withdraw.id,
      "failed",
      withdraw.createdAt,
      noteDetails.transactionId || "manual",
      noteDetails.telegramMessageId
    );
  } catch (err) {
    console.error("Failed to send payout force fail Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
  revalidatePath(getAdminPathPrefix() + "/payouts");
  revalidatePath(getAdminPathPrefix() + "/wallet");
}

export async function undoSunpaysPayoutFailureAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing request ID");

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!withdraw) throw new Error("Withdraw request not found");
  if (withdraw.status !== "REJECTED") {
    throw new Error(`Cannot undo failure for a request with status: ${withdraw.status}`);
  }

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  // Remove all trace of failure / rejection so it looks completely fresh to the player
  delete noteDetails.failureReason;
  delete noteDetails.rejectReason;
  delete noteDetails.rejectRemarks;
  delete noteDetails.failedAt;
  delete noteDetails.rejectedAt;

  const updatedNote = JSON.stringify({
    ...noteDetails,
    gateway: "sunpays",
    gatewayStatus: "processing",
  });

  await prisma.$transaction(async (tx) => {
    // 1. Deduct wallet balance (retrieve the refund)
    const wallet = await tx.wallet.update({
      where: { userId: withdraw.userId },
      data: { balance: { decrement: withdraw.amount } },
    });

    // 2. Create Ledger Entry for the deduction
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAW_REQUESTED",
        amount: -withdraw.amount,
        balanceAfter: wallet.balance,
        meta: { withdrawId: id, reason: "Undo payout failure: sent back to processing" },
      },
    });

    // 3. Update status back to APPROVED and save note
    await tx.withdrawRequest.update({
      where: { id: withdraw.id },
      data: {
        status: "APPROVED",
        reviewedById: staff.id,
        reviewedAt: new Date(),
        note: updatedNote,
      },
    });
  });

  const payoutAmount = Math.round(withdraw.amount * 0.95 * 100) / 100;
  await logAudit(staff.id, "WITHDRAW_UNDO_FAIL", "WithdrawRequest", id, { 
    amount: withdraw.amount, 
    netPayout: payoutAmount, 
    userId: withdraw.userId 
  });
  await logActivity("WITHDRAW_UNDO_FAIL", `Withdrawal of ${formatAmount(withdraw.amount)} failure undone, set back to processing`, staff.id, { withdrawId: id });

  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      withdraw.user.uid,
      withdraw.amount,
      "Withdrawal",
      withdraw.id,
      "processing",
      withdraw.createdAt,
      noteDetails.transactionId || "manual",
      noteDetails.telegramMessageId
    );
  } catch (err) {
    console.error("Failed to send payout undo fail Telegram notification:", err);
  }

  revalidatePath("/admin/wallet");
  revalidatePath(getAdminPathPrefix() + "/payouts");
  revalidatePath(getAdminPathPrefix() + "/wallet");
}

export async function dispatchMockPayoutAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing request ID");

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!withdraw) throw new Error("Withdraw request not found");
  if (withdraw.status !== "APPROVED") {
    throw new Error(`Cannot dispatch payout for request with status: ${withdraw.status}`);
  }

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  const payoutAmount = Math.round(withdraw.amount * 0.95 * 100) / 100;

  const updatedNote = JSON.stringify({
    ...noteDetails,
    gateway: "mock",
    gatewayStatus: "success",
    transactionId: `mock-${withdraw.id}`,
    submittedAt: new Date().toISOString(),
  });

  await prisma.withdrawRequest.update({
    where: { id: withdraw.id },
    data: {
      isMock: true,
      note: updatedNote,
    },
  });

  await logAudit(staff.id, "WITHDRAW_DISPATCHED", "WithdrawRequest", id, { amount: withdraw.amount, netPayout: payoutAmount, userId: withdraw.userId, isMock: true });
  await logActivity("WITHDRAW_DISPATCHED", `Withdrawal of ${formatAmount(withdraw.amount)} (Net: ${formatAmount(payoutAmount)}) completed via Mock Payout`, staff.id, { withdrawId: id });

  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    await sendTelegramNotification(
      withdraw.user.uid,
      withdraw.amount,
      "Withdrawal",
      withdraw.id,
      "mock",
      new Date(),
      `mock-${withdraw.id}`,
      noteDetails.telegramMessageId,
      true,
      staff.displayName
    );
  } catch (err) {
    console.error("Failed to send mock payout Telegram notification:", err);
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/wallet");
}

const adjustSchema = z.object({
  identifier: z.string().trim().min(1, "Enter a mobile number or UID"),
  amount: z.coerce.number().int().refine((v) => v !== 0, "Amount cannot be zero"),
  note: z.string().trim().optional(),
});

export async function adjustBalanceAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("wallet.adjust");
  const parsed = adjustSchema.safeParse({
    identifier: formData.get("identifier"),
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const identifier = parsed.data.identifier;
  let user = await prisma.user.findUnique({ where: { phone: identifier } });
  if (!user && /^\d+$/.test(identifier)) {
    user = await prisma.user.findUnique({ where: { uid: Number(identifier) } });
  }
  if (!user) return { error: "No user with that mobile number or UID" };

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) return { error: "Wallet not found" };

  if (parsed.data.amount < 0 && wallet.balance + parsed.data.amount < 0) {
    return { error: "Adjustment would make the balance negative" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { increment: parsed.data.amount } },
    });
    await tx.ledgerEntry.create({
      data: {
        walletId: w.id,
        type: "ADMIN_ADJUST",
        amount: parsed.data.amount,
        balanceAfter: w.balance,
        meta: { note: parsed.data.note ?? null, staffId: staff.id },
      },
    });
    return w;
  });

  await logAudit(staff.id, "BALANCE_ADJUSTED", "Wallet", updated.id, {
    userId: user.id,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
  });
  await logActivity("BALANCE_ADJUSTED", `${user.displayName}'s balance adjusted by ${formatAmount(parsed.data.amount)}`, staff.id, {
    userId: user.id,
  });

  revalidatePath("/admin/wallet");
  return { success: `Adjusted ${user.displayName}'s balance by ${formatAmount(parsed.data.amount)}. New balance: ${formatAmount(updated.balance)}` };
}

const resultModeSchema = z.object({ mode: z.enum(["RANDOM", "SCHEDULED"]) });

export async function setResultModeAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.mode");

  const parsed = resultModeSchema.safeParse({ mode: formData.get("mode") });
  if (!parsed.success) return { error: "Invalid mode" };

  await prisma.setting.upsert({
    where: { key: "resultMode" },
    update: { value: parsed.data.mode },
    create: { key: "resultMode", value: parsed.data.mode },
  });

  await logAudit(staff.id, "RESULT_MODE_CHANGED", "Setting", "resultMode", { mode: parsed.data.mode });
  await logActivity("RESULT_MODE_CHANGED", `Result mode changed to ${parsed.data.mode}`, staff.id);
  revalidatePath("/admin/results");
  return { success: `Result mode set to ${parsed.data.mode}` };
}

const winningPercentageSchema = z.object({
  percentage: z.coerce.number().int().min(0).max(100),
});

export async function setWinningPercentageAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.mode");

  const parsed = winningPercentageSchema.safeParse({ percentage: formData.get("percentage") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid percentage" };

  await prisma.setting.upsert({
    where: { key: "winningPercentage" },
    update: { value: String(parsed.data.percentage) },
    create: { key: "winningPercentage", value: String(parsed.data.percentage) },
  });

  await logAudit(staff.id, "WINNING_PERCENTAGE_CHANGED", "Setting", "winningPercentage", { percentage: parsed.data.percentage });
  await logActivity("WINNING_PERCENTAGE_CHANGED", `Winning percentage set to ${parsed.data.percentage}%`, staff.id);
  revalidatePath("/admin/results");
  return { success: `Winning percentage set to ${parsed.data.percentage}%` };
}

const brahmastraSchema = z.object({
  enabled: z.enum(["true", "false"]),
});

export async function setBrahmastraProfitsAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.mode");

  const parsed = brahmastraSchema.safeParse({ enabled: formData.get("enabled") });
  if (!parsed.success) return { error: "Invalid value" };

  await prisma.setting.upsert({
    where: { key: "brahmastraProfits" },
    update: { value: parsed.data.enabled },
    create: { key: "brahmastraProfits", value: parsed.data.enabled },
  });

  const statusStr = parsed.data.enabled === "true" ? "ENABLED" : "DISABLED";
  await logAudit(staff.id, "BRAHMASTRA_PROFITS_CHANGED", "Setting", "brahmastraProfits", { enabled: parsed.data.enabled });
  await logActivity("BRAHMASTRA_PROFITS_CHANGED", `Brahmastra mode is now ${statusStr}`, staff.id);
  revalidatePath("/admin/results");
  return { success: `Brahmastra Mode is now ${statusStr}` };
}

const overrideSchema = z.object({
  mode: z.enum(["S30", "M1", "M3", "M5"]),
  roundNumber: z.coerce.number().int().positive(),
  number: z.coerce.number().int().min(0).max(9),
});

export async function setResultOverrideAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("results.override");

  const parsed = overrideSchema.safeParse({
    mode: formData.get("mode"),
    roundNumber: formData.get("roundNumber"),
    number: formData.get("number"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { mode, roundNumber, number } = parsed.data;

  // Suffix lookup for convenience (e.g. entering just last 3 digits like "832")
  let resolvedRoundNumber = BigInt(roundNumber);
  if (roundNumber < 100000) {
    const currentRound = getRoundNumber(mode as WingoMode);
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

  const { endsAt } = getRoundWindow(mode as WingoMode, resolvedRoundNumber);
  if (Date.now() >= endsAt) {
    return { error: "That round has already ended" };
  }

  const existingResult = await prisma.wingoResult.findUnique({
    where: { mode_roundNumber: { mode, roundNumber: resolvedRoundNumber } },
  });
  if (existingResult) {
    return { error: "That round has already settled" };
  }

  await prisma.resultOverride.create({ data: { mode, roundNumber: resolvedRoundNumber, number, createdById: staff.id } });
  await logAudit(staff.id, "RESULT_OVERRIDE_SET", "ResultOverride", `${mode}:${resolvedRoundNumber}`, { number });
  await logActivity("RESULT_OVERRIDE_SET", `Manual override: ${mode} round #${resolvedRoundNumber} → ${number}`, staff.id);
  revalidatePath("/admin/results");
  return { success: `Override set — round #${resolvedRoundNumber} (${mode}) will settle as ${number}` };
}

const createGiftCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  amount: z.coerce.number().int().min(1).max(1_000_000),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : undefined)),
});

export async function createGiftCodeAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("giftcodes.manage");
  const parsed = createGiftCodeSchema.safeParse({
    code: formData.get("code"),
    amount: formData.get("amount"),
    maxRedemptions: formData.get("maxRedemptions"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const code = parsed.data.code ?? giftCodeAlphabet();

  const existing = await prisma.giftCode.findUnique({ where: { code } });
  if (existing) return { error: "That code already exists" };

  const giftCode = await prisma.giftCode.create({
    data: {
      code,
      amount: parsed.data.amount,
      maxRedemptions: parsed.data.maxRedemptions,
      expiresAt: parsed.data.expiresAt,
      createdById: staff.id,
    },
  });

  await logAudit(staff.id, "GIFT_CODE_CREATED", "GiftCode", giftCode.id, { code, amount: parsed.data.amount });
  await logActivity("GIFT_CODE_CREATED", `Gift code "${code}" created (${formatAmount(parsed.data.amount)})`, staff.id);
  revalidatePath("/admin/gift-codes");
  return { success: `Gift code "${code}" created (${formatAmount(parsed.data.amount)}, up to ${parsed.data.maxRedemptions} redemptions).` };
}

export async function toggleGiftCodeActiveAction(formData: FormData) {
  const staff = await assertPermission("giftcodes.manage");
  const id = String(formData.get("id"));
  const giftCode = await prisma.giftCode.findUnique({ where: { id } });
  if (!giftCode) return;

  await prisma.giftCode.update({ where: { id }, data: { isActive: !giftCode.isActive } });
  await logAudit(staff.id, giftCode.isActive ? "GIFT_CODE_DEACTIVATED" : "GIFT_CODE_ACTIVATED", "GiftCode", id);
  revalidatePath("/admin/gift-codes");
}

const broadcastEventSchema = z.object({
  label: z.string().trim().min(1, "Enter a short label for this event"),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

export async function broadcastEventRewardAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("giftcodes.manage");

  const parsed = broadcastEventSchema.safeParse({
    label: formData.get("label"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const eventId = randomUUID();
  const key = `event:${eventId}`;
  const recipients = await prisma.user.findMany({ where: { role: "USER" }, select: { id: true } });

  if (recipients.length === 0) {
    return { error: "No eligible users to send this to" };
  }

  const created = await prisma.reward.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "EVENT" as const,
      key,
      amount: parsed.data.amount,
      meta: { label: parsed.data.label },
    })),
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "REWARD_AVAILABLE" as const,
      title: "Event reward available",
      body: `${parsed.data.label} — claim your ${formatAmount(parsed.data.amount)} bonus in the Rewards Center.`,
      meta: { eventId },
    })),
  });

  await logAudit(staff.id, "EVENT_REWARD_BROADCAST", "Reward", eventId, {
    label: parsed.data.label,
    amount: parsed.data.amount,
    recipientCount: created.count,
  });
  await logActivity("EVENT_REWARD_BROADCAST", `Event "${parsed.data.label}" (${formatAmount(parsed.data.amount)}) sent to ${created.count} users`, staff.id);

  revalidatePath("/admin/gift-codes");
  return { success: `Sent "${parsed.data.label}" (${formatAmount(parsed.data.amount)}) to ${created.count} users.` };
}

const bonusSettingsSchema = z.object({
  signupBonus: z.coerce.number().int().min(0),
  dailyReward: z.coerce.number().int().min(0),
  referralReward: z.coerce.number().int().min(0),
  depositBonusPercent: z.coerce.number().min(0).max(100),
});

export async function saveBonusSettingsAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const staff = await assertPermission("bonuses.manage");

  const parsed = bonusSettingsSchema.safeParse({
    signupBonus: formData.get("signupBonus"),
    dailyReward: formData.get("dailyReward"),
    referralReward: formData.get("referralReward"),
    depositBonusPercent: formData.get("depositBonusPercent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const current = await getBonusSettings();
  const achievements: BonusSettings["achievements"] = { ...current.achievements };
  for (const key of Object.keys(DEFAULT_BONUS_SETTINGS.achievements)) {
    const raw = formData.get(key);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) achievements[key] = Math.trunc(n);
    }
  }

  await saveBonusSettings({ ...parsed.data, achievements });
  await logActivity("BONUS_SETTINGS_UPDATED", "Bonus & reward settings updated", staff.id);
  revalidatePath("/admin/bonuses");
  return { success: "Bonus settings saved." };
}

export async function changeAdminPasswordAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const actor = await getCurrentUser();
    if (!actor || (actor.role !== "STAFF" && actor.role !== "SUPER_ADMIN")) {
      return { error: "Not authorized" };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: "All fields are required" };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters long" };
    }

    if (newPassword !== confirmPassword) {
      return { error: "Passwords do not match" };
    }

    const valid = await verifyPassword(currentPassword, actor.passwordHash);
    if (!valid) {
      return { error: "Incorrect current password" };
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: hashed },
    });

    await logAudit(actor.id, "PASSWORD_CHANGE", "USER", actor.id);

    return { success: "Password changed successfully!" };
  } catch (err) {
    const errorObj = err as Error;
    console.error("Change password error:", errorObj);
    return { error: errorObj.message || "An unexpected error occurred" };
  }
}

export async function resetPartnerBalanceAction(userId: string): Promise<AdminActionState> {
  const staff = await assertPermission("users.manage");
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isPartner) {
      return { error: "User is not a partner account" };
    }

    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { balance: 50000 }
    });

    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_ADJUST",
        amount: 0,
        balanceAfter: 50000,
        meta: { note: "Reset Partner Balance to 50,000" }
      }
    });

    await logActivity("PARTNER_BALANCE_RESET", `Reset balance for partner ${user.displayName} (UID ${user.uid}) to ₹50,000`, staff.id);
    revalidatePath("/admin/users");
    return { success: "Balance successfully reset to ₹50,000!" };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message || "Failed to reset balance" };
  }
}

export async function adjustPartnerBalanceAction(userId: string, amount: number): Promise<AdminActionState> {
  const staff = await assertPermission("users.manage");
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isPartner) {
      return { error: "User is not a partner account" };
    }

    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } }
    });

    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_ADJUST",
        amount: amount,
        balanceAfter: wallet.balance,
        meta: { note: `Partner Balance Adjusted: ${amount}` }
      }
    });

    await logActivity("PARTNER_BALANCE_ADJUSTED", `Adjusted balance for partner ${user.displayName} (UID ${user.uid}) by ₹${amount}`, staff.id);
    revalidatePath("/admin/users");
    return { success: `Successfully adjusted balance by ₹${amount}!` };
  } catch (err) {
    const errorObj = err as Error;
    return { error: errorObj.message || "Failed to adjust balance" };
  }
}

export async function updateWithdrawalRejectReasonAction(formData: FormData) {
  const staff = await assertPermission("wallet.approve");
  const withdrawId = String(formData.get("withdrawId") || "");
  const remarks = String(formData.get("remarks") || "").trim();

  if (!withdrawId) {
    throw new Error("Withdrawal request ID is required");
  }

  const withdraw = await prisma.withdrawRequest.findUnique({
    where: { id: withdrawId },
  });

  if (!withdraw) {
    throw new Error("Withdrawal request not found");
  }

  if (withdraw.status !== "REJECTED") {
    throw new Error("Only rejected withdrawals can have their reason edited");
  }

  let noteDetails: any = {};
  try {
    noteDetails = JSON.parse(withdraw.note || "{}");
  } catch {}

  noteDetails.rejectReason = remarks;
  noteDetails.failureReason = remarks;

  await prisma.withdrawRequest.update({
    where: { id: withdraw.id },
    data: {
      note: JSON.stringify(noteDetails),
    },
  });

  revalidatePath("/admin/wallet");
  revalidatePath(getAdminPathPrefix() + "/wallet");
  revalidatePath(getAdminPathPrefix() + `/users/${withdraw.userId}`);
}

export async function resolveSupportIssueAction(formData: FormData) {
  const staff = await assertPermission("users.manage");
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing ID");

  const issue = await prisma.activityFeed.findUnique({ where: { id } });
  if (!issue) throw new Error("Issue not found");

  const meta = typeof issue.meta === "object" && issue.meta !== null ? (issue.meta as any) : {};

  await prisma.activityFeed.update({
    where: { id },
    data: {
      meta: {
        ...meta,
        resolved: true,
        resolvedById: staff.id,
        resolvedByName: staff.displayName,
        resolvedAt: new Date().toISOString(),
      }
    }
  });

  revalidatePath(getAdminPathPrefix() + "/customer-service");
}

export async function deleteSupportIssueAction(formData: FormData) {
  await assertPermission("users.manage");
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing ID");

  await prisma.activityFeed.delete({ where: { id } });

  revalidatePath(getAdminPathPrefix() + "/customer-service");
}
