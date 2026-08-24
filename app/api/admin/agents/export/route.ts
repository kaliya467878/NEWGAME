import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import { searchAgents, AGENT_TYPE_LABELS } from "@/lib/admin/agents";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "agents.view"))) {
    return new Response("Not authorized", { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";

  const rows = await searchAgents({ q, type, status, take: 5000 });

  const csv = toCsv(
    rows.map((a) => ({
      id: a.id,
      name: a.name,
      mobile: a.mobile,
      inviteCode: a.inviteCode,
      type: AGENT_TYPE_LABELS[a.type] ?? a.type,
      parent: a.parent?.name ?? "Root",
      commissionPct: a.commissionPct,
      downline: a._count.children,
      status: a.status,
      createdAt: a.createdAt,
    })),
    [
      { key: "id", label: "Agent ID" },
      { key: "name", label: "Name" },
      { key: "mobile", label: "Mobile" },
      { key: "inviteCode", label: "Invite code" },
      { key: "type", label: "Type" },
      { key: "parent", label: "Parent" },
      { key: "commissionPct", label: "Commission %" },
      { key: "downline", label: "Downline" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created" },
    ]
  );

  return csvResponse(csv, `agents-${Date.now()}.csv`);
}
