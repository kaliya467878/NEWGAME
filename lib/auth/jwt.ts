import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined!");
  }
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: "30d" });
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    if (!decoded || !decoded.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (user?.status === "SUSPENDED") return null;
    return user;
  } catch (err) {
    return null;
  }
}
