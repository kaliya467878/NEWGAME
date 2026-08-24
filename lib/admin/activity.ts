import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(
  type: string,
  message: string,
  actorId?: string,
  meta?: Record<string, unknown>
) {
  await prisma.activityFeed.create({
    data: { type, message, actorId, meta: meta as Prisma.InputJsonValue | undefined },
  });
}
