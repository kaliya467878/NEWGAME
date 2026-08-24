import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  meta?: Record<string, unknown>
) {
  await prisma.notification.create({
    data: { userId, type, title, body, meta: meta as Prisma.InputJsonValue | undefined },
  });
}

export async function getNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
