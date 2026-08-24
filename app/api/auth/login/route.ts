import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = await rateLimit("login", ip, 10, 60);
    if (!limiter.success) {
      return NextResponse.json({ message: "Too many login attempts. Please try again after a minute." }, { status: 429 });
    }

    const { mobile, password } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json({ message: "Phone number/email and password are required." }, { status: 400 });
    }

    const isEmail = mobile.includes("@");
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: mobile.toLowerCase().trim() } : { phone: mobile.trim() },
    });

    if (!user) {
      return NextResponse.json({ message: isEmail ? "Invalid email or password." : "Invalid phone number or password." }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json({ message: "Your account is suspended. Please contact support." }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid phone number or password." }, { status: 401 });
    }

    await createSession(user.id, false);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    const token = signToken(user.id);
    const mappedRole = user.role === "SUPER_ADMIN" ? "admin" : "player";

    // Set cookie for Server Action fallbacks
    const cookieStore = await cookies();
    cookieStore.set("luckynova_jwt", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        role: mappedRole,
        profile: {
          id: user.id,
          uid: user.uid,
          name: user.displayName,
          mobile: user.phone,
          inviteCode: user.referralCode,
        },
      },
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
