import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import { toCsv, csvResponse, parseDateRange } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "activity.view"))) {
    return new Response("Not authorized", { status: 403 });
  }

  const { gte, lte } = parseDateRange(req.nextUrl.searchParams);
  const action = req.nextUrl.searchParams.get("action") ?? undefined;

  const rows = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte, lte },
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    },
    include: { actor: { select: { displayName: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const csv = toCsv(
    rows.map((r) => ({
      createdAt: r.createdAt,
      action: r.action,
      actor: r.actor.displayName,
      actorPhone: r.actor.phone,
      targetType: r.targetType,
      targetId: r.targetId ?? "",
      meta: r.meta ? JSON.stringify(r.meta) : "",
    })),
    [
      { key: "createdAt", label: "Timestamp" },
      { key: "action", label: "Action" },
      { key: "actor", label: "Actor" },
      { key: "actorPhone", label: "Actor phone" },
      { key: "targetType", label: "Target type" },
      { key: "targetId", label: "Target ID" },
      { key: "meta", label: "Meta" },
    ]
  );

  return csvResponse(csv, `audit-log-${Date.now()}.csv`);
}
