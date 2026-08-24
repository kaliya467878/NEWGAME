import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import { searchUsers } from "@/lib/admin/users";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "users.view"))) {
    return new Response("Not authorized", { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const rows = await searchUsers(q, 5000);

  const csv = toCsv(
    rows.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      phone: u.phone,
      email: u.email ?? "",
      isGuest: u.isGuest ? "yes" : "no",
      status: u.status,
      balance: u.wallet?.balance ?? 0,
      referralCode: u.referralCode,
      createdAt: u.createdAt,
    })),
    [
      { key: "id", label: "User ID" },
      { key: "displayName", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "isGuest", label: "Guest" },
      { key: "status", label: "Status" },
      { key: "balance", label: "Balance" },
      { key: "referralCode", label: "Referral code" },
      { key: "createdAt", label: "Joined" },
    ]
  );

  return csvResponse(csv, `users-${Date.now()}.csv`);
}
