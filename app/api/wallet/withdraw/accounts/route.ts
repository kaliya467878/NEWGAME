import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import type { WithdrawalAccount } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const accounts = await prisma.withdrawalAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const bankAccounts = accounts.filter((a: WithdrawalAccount) => a.type === "bank");
    const upiAccounts = accounts.filter((a: WithdrawalAccount) => a.type === "upi");
    const usdtAccounts = accounts.filter((a: WithdrawalAccount) => a.type === "usdt");

    const preferredAccount = accounts.find((a: WithdrawalAccount) => a.isPreferred);
    const preferredMethod = preferredAccount ? preferredAccount.type : "upi";

    const selected = {
      bank: bankAccounts.find((a: WithdrawalAccount) => a.isPreferred)?.id || bankAccounts[0]?.id || null,
      upi: upiAccounts.find((a: WithdrawalAccount) => a.isPreferred)?.id || upiAccounts[0]?.id || null,
      usdt: usdtAccounts.find((a: WithdrawalAccount) => a.isPreferred)?.id || usdtAccounts[0]?.id || null,
    };

    return NextResponse.json({
      success: true,
      data: {
        method: preferredMethod,
        selected,
        bank: bankAccounts.map((a: WithdrawalAccount) => ({
          id: a.id,
          accountName: a.bankCardHolder || "",
          accountNumber: a.bankCardNumber || "",
          ifsc: a.ifsc || "",
          bankName: a.bankName || "",
        })),
        upi: upiAccounts.map((a: WithdrawalAccount) => ({
          id: a.id,
          upiId: a.upiId || "",
        })),
        usdt: usdtAccounts.map((a: WithdrawalAccount) => ({
          id: a.id,
          address: a.cryptoAddress || "",
        })),
      },
    });
  } catch (error: any) {
    console.error("GET wallet/withdraw/accounts API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const body = await req.json();
    const { type, accountName, accountNumber, ifsc, upiId, address, bankName } = body;

    if (!type || !["bank", "usdt"].includes(type)) {
      return NextResponse.json({ message: "Invalid account type. Must be bank or usdt." }, { status: 400 });
    }

    // Set other accounts of the same type for this user to isPreferred = false
    await prisma.withdrawalAccount.updateMany({
      where: { userId: user.id, type },
      data: { isPreferred: false },
    });

    let newAccount;
    if (type === "bank") {
      if (!accountName || !accountNumber || !ifsc || !bankName) {
        return NextResponse.json({ message: "Bank name, Account holder name, number, and IFSC are required for bank" }, { status: 400 });
      }
      
      const cleanBankName = String(bankName).trim();
      const cleanName = String(accountName).trim();
      const cleanNumber = String(accountNumber).trim();
      const cleanIfsc = String(ifsc).trim().toUpperCase();

      if (cleanBankName.length < 2 || cleanBankName.length > 100 || !/^[A-Za-z\s.()&-]+$/.test(cleanBankName)) {
        return NextResponse.json({ message: "Invalid bank name format." }, { status: 400 });
      }
      if (cleanName.length < 2 || cleanName.length > 100 || !/^[A-Za-z\s.]+$/.test(cleanName)) {
        return NextResponse.json({ message: "Invalid account holder name format. Letters and spaces only." }, { status: 400 });
      }
      if (!/^\d{9,20}$/.test(cleanNumber)) {
        return NextResponse.json({ message: "Invalid bank account number format. Must be between 9 and 20 digits." }, { status: 400 });
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return NextResponse.json({ message: "Invalid IFSC code format." }, { status: 400 });
      }

      const existingBankCard = await prisma.withdrawalAccount.findFirst({
        where: { bankCardNumber: cleanNumber },
      });
      if (existingBankCard) {
        return NextResponse.json({ message: "This bank account number has already been linked to another account." }, { status: 400 });
      }
      newAccount = await prisma.withdrawalAccount.create({
        data: {
          userId: user.id,
          type,
          bankCardHolder: cleanName,
          bankCardNumber: cleanNumber,
          ifsc: cleanIfsc,
          bankName: cleanBankName,
          isPreferred: true,
        },
      });
    } else if (type === "upi") {
      if (!upiId || !accountName) {
        return NextResponse.json({ message: "UPI ID and Full Name are required" }, { status: 400 });
      }
      
      const cleanName = String(accountName).trim();
      const cleanUpi = String(upiId).trim().toLowerCase();

      if (cleanName.length < 2 || cleanName.length > 100 || !/^[A-Za-z\s.]+$/.test(cleanName)) {
        return NextResponse.json({ message: "Invalid Full Name format. Letters and spaces only." }, { status: 400 });
      }
      if (!/^[\w.-]+@[\w.-]+$/.test(cleanUpi) || cleanUpi.length > 100) {
        return NextResponse.json({ message: "Invalid UPI ID format. E.g. example@paytm" }, { status: 400 });
      }

      const existingUpi = await prisma.withdrawalAccount.findFirst({
        where: { upiId: cleanUpi },
      });
      if (existingUpi) {
        return NextResponse.json({ message: "This UPI ID has already been linked to another account." }, { status: 400 });
      }
      newAccount = await prisma.withdrawalAccount.create({
        data: {
          userId: user.id,
          type,
          upiId: cleanUpi,
          bankCardHolder: cleanName,
          isPreferred: true,
        },
      });
    } else {
      // USDT
      if (!address) {
        return NextResponse.json({ message: "USDT Wallet address is required" }, { status: 400 });
      }
      
      const cleanAddress = String(address).trim();
      if (!/^T[A-Za-z1-9]{33}$/.test(cleanAddress)) {
        return NextResponse.json({ message: "Invalid USDT TRC20 wallet address. Must start with 'T' and be 34 characters long." }, { status: 400 });
      }

      const existingUsdt = await prisma.withdrawalAccount.findFirst({
        where: { cryptoAddress: cleanAddress },
      });
      if (existingUsdt) {
        return NextResponse.json({ message: "This USDT TRC20 address has already been linked to another account." }, { status: 400 });
      }
      newAccount = await prisma.withdrawalAccount.create({
        data: {
          userId: user.id,
          type,
          cryptoAddress: cleanAddress,
          cryptoNetwork: "TRC20",
          isPreferred: true,
        },
      });
    }

    // Update overall preferred method preferences by setting other type accounts isPreferred = false
    await prisma.withdrawalAccount.updateMany({
      where: { userId: user.id, NOT: { id: newAccount.id } },
      data: { isPreferred: false },
    });

    // Make the new account the overall preferred one
    await prisma.withdrawalAccount.update({
      where: { id: newAccount.id },
      data: { isPreferred: true },
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal account linked successfully",
      data: {
        id: newAccount.id,
        type: newAccount.type,
      },
    });
  } catch (error: any) {
    console.error("POST wallet/withdraw/accounts API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
