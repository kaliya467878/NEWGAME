import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";
import jwt from "jsonwebtoken";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "luckynova_session";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined!");
  }
  return secret;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 1 day
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signToken(userId: string): string {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: "30d" });
}

export async function createAdminSession(userId: string) {
  const token = signToken(userId);
  const ttl = DEFAULT_TTL_SECONDS;

  const cookieStore = await cookies();
  
  cookieStore.set("luckynova_admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

export async function createSession(userId: string, rememberMe: boolean) {
  const token = signToken(userId);
  const ttl = rememberMe ? REMEMBER_TTL_SECONDS : DEFAULT_TTL_SECONDS;

  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });

  cookieStore.set("luckynova_jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete("luckynova_jwt");
  cookieStore.delete("luckynova_admin_session");
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const reqHeaders = await headers();
  const pathname = reqHeaders.get("x-pathname") || "";
  const referer = reqHeaders.get("referer") || "";
  const adminPrefix = process.env.ADMIN_PANEL_PATH || "/admin";
  
  // Prioritize the admin session cookie if the request is on the admin path or referer
  const isAdminRequest = 
    pathname.startsWith(adminPrefix) || 
    pathname.startsWith("/admin") ||
    referer.includes(adminPrefix) || 
    referer.includes("/admin");

  const token = isAdminRequest
    ? (cookieStore.get("luckynova_admin_session")?.value || cookieStore.get(COOKIE_NAME)?.value || cookieStore.get("luckynova_jwt")?.value)
    : (cookieStore.get(COOKIE_NAME)?.value || cookieStore.get("luckynova_jwt")?.value);

  if (!token) return null;

  let userId: string | null = null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    if (decoded && decoded.id) {
      userId = decoded.id;
    }
  } catch (err) {
    // invalid token or expired
  }

  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.status === "SUSPENDED") return null;

  return user;
}
