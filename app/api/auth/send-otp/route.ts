import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // IP limit: max 3 OTP requests per IP per minute
    const ipLimiter = await rateLimit("otp_ip", ip, 3, 60);
    if (!ipLimiter.success) {
      return NextResponse.json({ message: "Too many requests from this IP. Please try again after a minute." }, { status: 429 });
    }

    const { mobile } = await req.json();
    if (!mobile) {
      return NextResponse.json({ message: "Mobile number/email is required." }, { status: 400 });
    }

    const cleanMobile = String(mobile).trim().toLowerCase();

    // Mobile number limit: max 1 OTP request per phone/email per minute
    const mobileLimiter = await rateLimit("otp_mobile", cleanMobile, 1, 60);
    if (!mobileLimiter.success) {
      return NextResponse.json({ message: "An OTP was already requested for this number. Please wait a minute." }, { status: 429 });
    }

    // Generate a secure 6-digit verification code
    const isProd = process.env.NODE_ENV === "production";
    const code = isProd 
      ? String(crypto.randomInt(100000, 999999))
      : "123456";

    // Store in Redis with a 5-minute (300 seconds) expiration
    const redisKey = `otp:${cleanMobile}`;
    await redis.set(redisKey, code, "EX", 300);

    if (isProd) {
      console.log(`[OTP] Production OTP code generated for ${cleanMobile}`);
      // SMS gateway dispatch logic goes here
      return NextResponse.json({
        success: true,
        message: "Verification code sent successfully.",
      });
    } else {
      console.log(`[OTP] Dev mockup OTP code generated for ${cleanMobile}: ${code}`);
      return NextResponse.json({
        success: true,
        message: `Verification code sent successfully (Dev mockup: use code ${code}).`,
      });
    }
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
