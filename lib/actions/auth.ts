"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAdminPathPrefix } from "@/lib/admin/path";
import { randomInt, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { generateDisplayName, generateAvatarSeed, generateReferralCode } from "@/lib/auth/identity";
import { sendOtpEmail } from "@/lib/mailer";
import { logActivity } from "@/lib/admin/activity";
import { getBonusSettings } from "@/lib/settings/bonuses";
import { rateLimit } from "@/lib/rateLimit";

export type ActionState = { error?: string; success?: string };

const OTP_TTL_SECONDS = 60 * 10;

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number");

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  country: z.string().trim().min(2).max(2).default("IN"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  referralCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.toUpperCase() : undefined)),
});

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
    country: formData.get("country") || "IN",
    email: formData.get("email"),
    referralCode: formData.get("referralCode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { phone, password, country, email, referralCode } = parsed.data;

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    return { error: "An account with this mobile number already exists" };
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return { error: "An account with this email already exists" };
    }
  }

  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) {
      return { error: "Invalid referral code" };
    }
    referredById = referrer.id;
  }

  const passwordHash = await hashPassword(password);
  const { signupBonus } = await getBonusSettings();

  let newUserId: string;
  // Regenerating the referral code on a rare collision keeps this loop bounded
  // without needing a global lock around code generation.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            phone,
            passwordHash,
            country,
            email,
            referredById,
            displayName: generateDisplayName(),
            avatarSeed: generateAvatarSeed(),
            referralCode: generateReferralCode(),
          },
        });

        const wallet = await tx.wallet.create({
          data: { userId: created.id, balance: signupBonus },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "WELCOME_BONUS",
            amount: signupBonus,
            balanceAfter: signupBonus,
          },
        });

        return created;
      });

      newUserId = user.id;
      await createSession(newUserId, false);
      await logActivity("USER_REGISTERED", `New user registered (${user.displayName})`, user.id);
      break;
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (isUniqueViolation && attempt < 4) continue;
      return { error: "Something went wrong. Please try again." };
    }
  }

  redirect("/dashboard");
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your mobile number or email"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().default(false),
});

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { identifier, password, rememberMe } = parsed.data;
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findUnique({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });

  if (!user) {
    return { error: "Invalid credentials" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid credentials" };
  }

  await createSession(user.id, rememberMe);
  redirect("/dashboard");
}

export async function continueAsGuestAction() {
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") || "127.0.0.1";
  const limiter = await rateLimit("guest_signup", ip, 1, 3600); // 1 guest account per hour per IP
  if (!limiter.success) {
    throw new Error("Too many guest accounts created from this IP. Please register a regular account.");
  }

  const guestPhone = `guest_${randomBytes(8).toString("hex")}`;
  const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
  const { signupBonus } = await getBonusSettings();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        phone: guestPhone,
        passwordHash,
        isGuest: true,
        displayName: generateDisplayName(),
        avatarSeed: generateAvatarSeed(),
        referralCode: generateReferralCode(),
      },
    });

    const wallet = await tx.wallet.create({
      data: { userId: created.id, balance: signupBonus },
    });

    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "WELCOME_BONUS",
        amount: signupBonus,
        balanceAfter: signupBonus,
      },
    });

    return created;
  });

  await createSession(user.id, false);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const requestResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export async function requestPasswordResetAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way whether or not the email exists, so this
  // can't be used to enumerate registered addresses.
  if (!user) {
    return { success: "If that email is registered, a reset code has been sent." };
  }

  const otp = randomInt(100000, 999999).toString();
  const otpHash = await hashPassword(otp);

  await prisma.passwordResetRequest.create({
    data: { userId: user.id, email, otpHash },
  });

  await redis.set(`pwreset:${email}`, JSON.stringify({ userId: user.id, otpHash }), "EX", OTP_TTL_SECONDS);

  await sendOtpEmail(email, otp);

  return { success: "If that email is registered, a reset code has been sent." };
}

const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().length(6, "Enter the 6-digit code"),
  newPassword: passwordSchema,
});

export async function resetPasswordWithOtpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, otp, newPassword } = parsed.data;

  const raw = await redis.get(`pwreset:${email}`);
  if (!raw) {
    return { error: "This code has expired. Please request a new one." };
  }

  const { userId, otpHash } = JSON.parse(raw) as { userId: string; otpHash: string };
  const validOtp = await verifyPassword(otp, otpHash);
  if (!validOtp) {
    return { error: "Incorrect code" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.passwordResetRequest.updateMany({
      where: { userId, email, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);

  await redis.del(`pwreset:${email}`);

  return { success: "Password updated. You can now log in." };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "STAFF" && user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return user;
}
