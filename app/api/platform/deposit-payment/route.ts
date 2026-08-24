import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createNowPaymentsPayment } from "@/lib/nowpayments";
import { sendTelegramNotification } from "@/lib/telegram";
import { createSunpaysPayin } from "@/lib/sunpays";
import { getRequestBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel");
    const amountParam = searchParams.get("amount");
    const amount = Number(amountParam);

    if (!channelId || !amountParam || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Retrieve or auto-create the deposit channel to ensure it exists
    let channel = await prisma.depositChannel.findFirst({
      where: {
        OR: [
          { id: channelId },
          { channelKey: channelId },
        ],
      },
    });

    if (channel) {
      const keyLower = channel.channelKey.toLowerCase();
      const isSunpaysKey = keyLower.includes("sunpay") || keyLower.includes("paytmx") || keyLower.includes("upixqr");
      
      // Auto-heal: If it is a Sunpays/UPI channel but currently stored as crypto, correct it in the database
      if (isSunpaysKey && channel.channelType !== "upi") {
        channel = await prisma.depositChannel.update({
          where: { id: channel.id },
          data: {
            channelType: "upi",
            label: "Sunpay UPI x QR",
            minAmount: 100,
          },
        });
      }
    }

    if (!channel) {
      const idLower = channelId.toLowerCase();
      const isSunpaysKey = idLower.includes("sunpay") || idLower.includes("paytmx") || idLower.includes("upixqr");
      const isUpi = isSunpaysKey || idLower.includes("upi") || idLower.includes("paytm") || idLower.includes("phonepe") || idLower.includes("qr");

      if (isUpi) {
        channel = await prisma.depositChannel.create({
          data: {
            kind: "CHANNEL",
            channelKey: channelId,
            label: isSunpaysKey ? "Sunpay UPI x QR" : "UPI Paytm/PhonePe QR",
            channelType: "upi",
            minAmount: 100,
            maxAmount: 50000,
            active: true,
          },
        });
      } else {
        const isTrc = channelId.includes("trc20");
        const label = isTrc ? "TronPay-USDT (TRC20)" : "Binance-USDT (BEP20)";
        const minAmount = isTrc ? 12 : 1;

        channel = await prisma.depositChannel.create({
          data: {
            kind: "CHANNEL",
            channelKey: channelId,
            label,
            channelType: "crypto",
            minAmount,
            maxAmount: 100000,
            active: true,
          },
        });
      }
    }

    if (!channel.active) {
      return NextResponse.json({ error: "This channel is currently inactive" }, { status: 400 });
    }

    if (amount < channel.minAmount || amount > channel.maxAmount) {
      return NextResponse.json(
        { error: `Amount must be between ${channel.minAmount} and ${channel.maxAmount}` },
        { status: 400 }
      );
    }

    const baseUrl = getRequestBaseUrl(request);
    const ipnCallbackUrl = `${baseUrl}/api/wallet/nowpayments-ipn`;

    const isSunpays =
      channel.channelKey.toLowerCase().includes("sunpay") ||
      channel.channelKey.toLowerCase().includes("paytmx") ||
      channel.channelKey.toLowerCase().includes("upixqr") ||
      channel.label.toLowerCase().includes("sunpay") ||
      channel.label.toLowerCase().includes("paytmx") ||
      channel.label.toLowerCase().includes("upixqr") ||
      (channel.channelType.toUpperCase() === "UPI" && (!channel.detail || !channel.detail.includes("@")));

    if (isSunpays) {
      // 1. Create a PENDING deposit request in database
      const depositRequest = await prisma.depositRequest.create({
        data: {
          userId: user.id,
          amount: amount,
          status: "PENDING",
          channelKey: channel.channelKey,
        },
      });

      try {
        const notifyUrl = `${baseUrl}/api/wallet/sunpays-payin-ipn/b14ed658d0fbda54d296a336c28f3e59a333b29ef5ee8fb62a5e67900010c5fd`;
        
        console.log(`Calling Sunpay payin for deposit: ${depositRequest.id}, Amount: ${amount}`);
        const spResponse = await createSunpaysPayin({
          order_id: depositRequest.id,
          amount: amount,
          currency: "INR",
          method: "upi",
          customer_name: user.displayName || "User",
          customer_phone: user.phone || undefined,
          customer_email: user.email || undefined,
          notify_url: notifyUrl,
        });

        console.log("Sunpays response:", spResponse);

        const checkoutUrl = spResponse.checkout_url || spResponse.payment_url || spResponse.transaction?.gateway_payment_url || spResponse.redirect_url;
        if (!checkoutUrl) {
          throw new Error("No checkout_url returned from Sunpay");
        }

        // Send initial Telegram bot notification
        const mode = "Sunpay UPI";
        let telegramMessageId: number | null = null;
        try {
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

        const updatedNote = JSON.stringify({
          gateway: "sunpays",
          checkoutUrl: checkoutUrl,
          telegramMessageId: telegramMessageId || undefined,
        });

        await prisma.depositRequest.update({
          where: { id: depositRequest.id },
          data: { 
            providerId: String(spResponse.transaction?.id || spResponse.id || depositRequest.id),
            note: updatedNote 
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            type: "sunpays",
            depositId: depositRequest.id,
            checkoutUrl: checkoutUrl,
            channelLabel: channel.label,
          },
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Sunpays payin creation failed:", err);
        await prisma.depositRequest.delete({ where: { id: depositRequest.id } });
        return NextResponse.json({ error: "Failed to initiate Sunpay payment gateway: " + errMsg }, { status: 500 });
      }
    }

    const typeLower = String(channel.channelType || "").toLowerCase();
    const isCrypto = typeLower.includes("crypto") || typeLower.includes("usdt");

    if (isCrypto) {
      const usdtRate = 102; // stable exchange rate fallback
      const amountInr = Math.round(amount * usdtRate);
      const priceAmountInr = amountInr; // Pass INR amount directly since NowPayments helper uses 'inr' as price_currency

      // 1. Create a PENDING deposit request in database
      const depositRequest = await prisma.depositRequest.create({
        data: {
          userId: user.id,
          amount: amountInr,
          status: "PENDING",
          channelKey: channel.channelKey,
        },
      });

      const payCurrency = channelId.toLowerCase().includes("bep20") ? "usdtbsc" : "usdttrc20";

      // 2. Request address and amount from NOWPayments gateway
      console.log(`Calling NOWPayments for deposit: ${depositRequest.id}, Amount INR: ${priceAmountInr}`);
      const npPayment = await createNowPaymentsPayment(
        priceAmountInr,
        payCurrency,
        depositRequest.id,
        ipnCallbackUrl
      );

      // 3. Send initial Telegram bot notification
      const mode = "Usdt(deposit channel)";
      let telegramMessageId: number | null = null;
      try {
        const msgId = await sendTelegramNotification(
          user.uid,
          amountInr,
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

      // 4. Save NOWPayments response details and telegram message ID in database note
      const updatedNote = JSON.stringify({
        paymentId: npPayment.payment_id,
        payAddress: npPayment.pay_address,
        payAmount: npPayment.pay_amount,
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

      // 5. Return details to user payment screen
      return NextResponse.json({
        success: true,
        data: {
          type: "crypto",
          depositId: depositRequest.id,
          walletAddress: npPayment.pay_address,
          payAmount: npPayment.pay_amount,
          usdtRate,
          channelLabel: channel.label,
          expirationEstimateDate: npPayment.expiration_estimate_date,
        },
      });
    } else {
      // Manual UPI Channel
      const depositRequest = await prisma.depositRequest.create({
        data: {
          userId: user.id,
          amount: amount,
          status: "PENDING",
          channelKey: channel.channelKey,
          note: JSON.stringify({ manualChannelLabel: channel.label }),
        },
      });

      // Send initial Telegram notification
      const mode = "Upi(deposit channel)";
      let telegramMessageId: number | null = null;
      try {
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

      // Save telegram message ID in note
      const updatedNote = JSON.stringify({
        manualChannelLabel: channel.label,
        telegramMessageId: telegramMessageId || undefined,
      });

      await prisma.depositRequest.update({
        where: { id: depositRequest.id },
        data: { note: updatedNote },
      });

      return NextResponse.json({
        success: true,
        data: {
          type: "upi",
          depositId: depositRequest.id,
          upiId: channel.detail || "merchant@upi",
          payeeName: channel.label,
          note: depositRequest.id,
          channelLabel: channel.label,
        },
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to initialize deposit request";
    console.error("Error creating deposit payment:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
