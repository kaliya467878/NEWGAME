"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/auth";
import { formatAmount } from "@/lib/format";

import { headers } from "next/headers";
import { createNowPaymentsPayment } from "@/lib/nowpayments";

const amountSchema = z.coerce.number().int().min(1).max(1_000_000);

export async function requestDepositAction(_prevState: ActionState, formData: FormData): Promise<ActionState & { redirectUrl?: string }> {
  const user = await requireUser();
  const amountParsed = amountSchema.safeParse(formData.get("amount"));
  if (!amountParsed.success) {
    return { error: "Enter a valid amount" };
  }
  const amount = amountParsed.data;

  // Mock flow for partner accounts
  if (user.isPartner) {
    await prisma.$transaction(async (tx) => {
      const depositRequest = await tx.depositRequest.create({
        data: {
          userId: user.id,
          amount: amount,
          status: "APPROVED",
          isMock: true,
          note: JSON.stringify({ note: "Mock Partner Deposit Auto-Approved" }),
        },
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        update: { balance: { increment: amount } },
        create: { userId: user.id, balance: amount },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT_APPROVED",
          amount: amount,
          balanceAfter: wallet.balance,
          meta: { depositId: depositRequest.id, note: "Mock Partner Deposit Setup" },
        },
      });
    });

    revalidatePath("/wallet");
    return { success: `Successfully processed mock deposit of ${formatAmount(amount)}!` };
  }

  const channelId = formData.get("channelId") ? String(formData.get("channelId")) : null;
  if (!channelId) {
    return { error: "Please select a deposit channel" };
  }

  // Fetch the selected channel
  const channel = await prisma.depositChannel.findFirst({
    where: {
      OR: [
        { id: channelId },
        { channelKey: channelId },
      ],
      active: true,
    },
  });

  if (!channel) {
    return { error: "Selected deposit channel is invalid or inactive" };
  }

  // Validate amount limits
  if (amount < channel.minAmount || amount > channel.maxAmount) {
    return {
      error: `Amount must be between ${formatAmount(channel.minAmount)} and ${formatAmount(channel.maxAmount)} for this channel`,
    };
  }

  const channelKey = channel.channelKey.toLowerCase();
  const isTrc20 = channelKey.includes("trc20");
  const isBep20 = channelKey.includes("bep20");

  if (isTrc20 || isBep20) {
    const payCurrency = isTrc20 ? "usdttrc20" : "usdtbsc";
    const amountInUsd = amount / 97;

    // Enforce minimum limit of $1 USD for USDT (Bep20) and $12 USD for USDT (TRC20)
    const minAllowedUsd = isTrc20 ? 12 : 1;
    if (amountInUsd < minAllowedUsd) {
      return {
        error: `Minimum deposit for ${isTrc20 ? "USDT (TRC20)" : "USDT (Bep20)"} is $${minAllowedUsd} USD (₹${minAllowedUsd * 97} INR).`,
      };
    }

    // Create the pending request first to obtain the order ID (request ID)
    const depositRequest = await prisma.depositRequest.create({
      data: {
        userId: user.id,
        amount: amount,
        status: "PENDING",
      },
    });

    try {
      // Dynamic generation of callback URL
      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const ipnCallbackUrl = `${protocol}://${host}/api/wallet/nowpayments-ipn`;

      // Convert INR to USD using the custom exchange rate (1 USD = 97 INR)
      const priceAmountUsd = Number((amount / 97).toFixed(2));

      // Call NOWPayments to generate payment
      const npPayment = await createNowPaymentsPayment(
        priceAmountUsd,
        payCurrency,
        depositRequest.id,
        ipnCallbackUrl
      );

      // Send initial Telegram bot notification
      const mode = "Usdt(deposit channel)";
      let telegramMessageId: number | null = null;
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const msgId = await sendTelegramNotification(
          user.uid,
          amount,
          mode,
          depositRequest.id,
          "created",
          depositRequest.createdAt,
          "N/A"
        );
        if (msgId) telegramMessageId = msgId;
      } catch (err) {
        console.error("Failed to send Telegram notification:", err);
      }

      // Save NOWPayments info in the note field as JSON
      const updatedNote = JSON.stringify({
        paymentId: npPayment.payment_id,
        payAddress: npPayment.pay_address,
        payAmount: priceAmountUsd,
        payCurrency: npPayment.pay_currency,
        priceAmount: npPayment.price_amount,
        priceCurrency: npPayment.price_currency,
        expirationEstimateDate: npPayment.expiration_estimate_date,
        telegramMessageId: telegramMessageId || undefined,
      });

      await prisma.depositRequest.update({
        where: { id: depositRequest.id },
        data: { note: updatedNote },
      });

      revalidatePath("/wallet");
      return {
        success: "Payment page generated.",
        redirectUrl: `/wallet/pay?id=${depositRequest.id}`,
      };
    } catch (error) {
      const err = error as Error;
      console.error("NOWPayments payment generation failed:", err);
      // Delete the request if payment generation failed to prevent orphan pending requests
      await prisma.depositRequest.delete({
        where: { id: depositRequest.id },
      });
      
      // Check for minimal amount error from NOWPayments
      if (err.message && err.message.includes("AMOUNT_MINIMAL_ERROR")) {
        try {
          const jsonStart = err.message.indexOf("{");
          if (jsonStart !== -1) {
            const errorJson = JSON.parse(err.message.substring(jsonStart)) as Record<string, string>;
            if (errorJson.message) {
              return { error: `Amount is too low: ${errorJson.message}. Please enter a larger deposit amount.` };
            }
          }
        } catch (parseErr) {
          console.error("Error parsing minimal amount error JSON:", parseErr);
        }
      }
      
      return { error: "Failed to initiate payment gateway. Please try again." };
    }
  }

  // Standard manual deposit request flow (static/UPI)
  const depositRequest = await prisma.depositRequest.create({
    data: {
      userId: user.id,
      amount: amount,
      status: "PENDING",
      note: JSON.stringify({ manualChannelLabel: channel.label }),
    },
  });

  const mode = "Upi(deposit channel)";
  let telegramMessageId: number | null = null;
  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    const msgId = await sendTelegramNotification(
      user.uid,
      amount,
      mode,
      depositRequest.id,
      "created",
      depositRequest.createdAt,
      "N/A"
    );
    if (msgId) telegramMessageId = msgId;
  } catch (err) {
    console.error("Failed to send Telegram notification:", err);
  }

  await prisma.depositRequest.update({
    where: { id: depositRequest.id },
    data: {
      note: JSON.stringify({
        manualChannelLabel: channel.label,
        telegramMessageId: telegramMessageId || undefined,
      }),
    },
  });

  revalidatePath("/wallet");
  return { success: `Deposit request for ${formatAmount(amount)} submitted for review.` };
}

export async function requestWithdrawAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = amountSchema.safeParse(formData.get("amount"));
  if (!parsed.success) {
    return { error: "Enter a valid amount" };
  }

  const amount = parsed.data;

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balance < amount) {
    return { error: "Insufficient balance" };
  }

  // Check wager requirements for regular players
  if (!user.isPartner && user.requiredWager > 0) {
    return { error: `Wager requirement not met. You must complete ₹${user.requiredWager.toLocaleString("en-IN")} more in wagers (bets) before you can withdraw.` };
  }

  // Mock flow for partner accounts
  if (user.isPartner) {
    await prisma.$transaction(async (tx) => {
      const withdrawRequest = await tx.withdrawRequest.create({
        data: { 
          userId: user.id, 
          amount: amount,
          status: "APPROVED",
          isMock: true,
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: amount } },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAW_APPROVED",
          amount: -amount,
          balanceAfter: updatedWallet.balance,
          meta: { withdrawId: withdrawRequest.id, note: "Mock Partner Withdrawal Setup" },
        },
      });
    });

    revalidatePath("/wallet");
    return { success: `Withdrawal of ${formatAmount(amount)} processed successfully (Mock Partner Account).` };
  }

  await prisma.withdrawRequest.create({
    data: { userId: user.id, amount: amount },
  });

  revalidatePath("/wallet");
  return { success: `Withdrawal request for ${formatAmount(amount)} submitted for review.` };
}

export async function submitDepositPaymentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = formData.get("id") ? String(formData.get("id")) : null;
  const txid = formData.get("txid") ? String(formData.get("txid")).trim() : "";
  const file = formData.get("screenshot") as File | null;

  if (!id) return { error: "Invalid request ID" };

  const deposit = await prisma.depositRequest.findUnique({ where: { id } });
  if (!deposit || deposit.userId !== user.id) {
    return { error: "Deposit request not found" };
  }

  let screenshotUrl = "";
  if (file && file.size > 0) {
    try {
      const { uploadImage } = await import("@/lib/storage/supabase");
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop() || "png";
      screenshotUrl = await uploadImage(buffer, file.type, ext);
    } catch (err) {
      const errorObj = err as Error;
      console.error("Screenshot upload failed:", errorObj);
      return { error: "Failed to upload screenshot: " + errorObj.message };
    }
  }

  // Parse existing note
  let existingNote: { payCurrency?: string; manualChannelLabel?: string; txid?: string; screenshotUrl?: string; telegramMessageId?: number } = {};
  try {
    existingNote = JSON.parse(deposit.note || "{}") as { payCurrency?: string; manualChannelLabel?: string; txid?: string; screenshotUrl?: string; telegramMessageId?: number };
  } catch {}

  // Call Telegram notification for "created" status (updating with txid)
  const mode = (existingNote.payCurrency || existingNote.manualChannelLabel || "").toLowerCase().includes("usdt") || (existingNote.payCurrency || existingNote.manualChannelLabel || "").toLowerCase().includes("trc20") || (existingNote.payCurrency || existingNote.manualChannelLabel || "").toLowerCase().includes("bep20") ? "Usdt(deposit channel)" : "Upi(deposit channel)";

  let telegramMessageId: number | null = null;
  try {
    const { sendTelegramNotification } = await import("@/lib/telegram");
    const msgId = await sendTelegramNotification(
      user.uid,
      deposit.amount,
      mode,
      id,
      "created",
      deposit.createdAt,
      txid || "N/A",
      existingNote.telegramMessageId
    );
    if (msgId) telegramMessageId = msgId;
  } catch (err) {
    console.error("Failed to send details submission Telegram notification:", err);
  }

  // Update note with txid, screenshotUrl, and telegramMessageId
  const updatedNote = JSON.stringify({
    ...existingNote,
    txid: txid || existingNote.txid,
    screenshotUrl: screenshotUrl || existingNote.screenshotUrl,
    submittedAt: new Date().toISOString(),
    telegramMessageId: telegramMessageId || existingNote.telegramMessageId,
  });

  await prisma.depositRequest.update({
    where: { id },
    data: { note: updatedNote },
  });

  revalidatePath("/wallet");
  return { success: "Payment details submitted. We will verify your transaction shortly." };
}
