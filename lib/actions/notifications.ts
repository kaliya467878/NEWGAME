"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
}
