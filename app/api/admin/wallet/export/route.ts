import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import { getWalletHistory } from "@/lib/admin/walletRequests";
import { toCsv, csvResponse, parseDateRange } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "wallet.view"))) {
    return new Response("Not authorized", { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") === "withdraw" ? "withdraw" : "deposit";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const createdAt = parseDateRange(req.nextUrl.searchParams);

  const rows = await getWalletHistory(type, { q, take: 5000, createdAt });

  const csv = toCsv(
    rows.map((r) => ({
      id: r.id,
      user: r.user.displayName,
      phone: r.user.phone,
      amount: r.amount,
      status: r.status,
      reviewedBy: r.reviewedBy?.displayName ?? "",
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt ?? "",
    })),
    [
      { key: "id", label: "Request ID" },
      { key: "user", label: "User" },
      { key: "phone", label: "Phone" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "reviewedBy", label: "Reviewed by" },
      { key: "createdAt", label: "Requested at" },
      { key: "reviewedAt", label: "Reviewed at" },
    ]
  );

  return csvResponse(csv, `${type}s-${Date.now()}.csv`);
}
