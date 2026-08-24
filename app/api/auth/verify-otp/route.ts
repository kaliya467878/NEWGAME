import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { mobile, code } = await req.json();
    if (!mobile || !code) {
      return NextResponse.json({ message: "Mobile number/email and verification code are required." }, { status: 400 });
    }

    const cleanMobile = String(mobile).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const redisKey = `otp:${cleanMobile}`;
    const storedCode = await redis.get(redisKey);

    if (!storedCode) {
      return NextResponse.json({ message: "Verification code has expired or was not requested." }, { status: 400 });
    }

    if (storedCode !== cleanCode) {
      return NextResponse.json({ message: "Invalid verification code." }, { status: 400 });
    }

    // Delete OTP from Redis on successful verification to prevent reuse
    await redis.del(redisKey);

    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully.",
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
