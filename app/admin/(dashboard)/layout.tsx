import Link from "next/link";
import { requireStaff } from "@/lib/actions/auth";
import { logoutAction } from "@/lib/actions/auth";
import { getEffectivePermissions } from "@/lib/admin/permissions";
import { AdminSidebar } from "./AdminSidebar";
import { getAdminPathPrefix } from "@/lib/admin/path";

const NAV_GROUPS = [
  {
    group: "Overview",
    items: [
      { href: "", label: "Dashboard", permission: null },
      { href: "/reports", label: "Financial Reports", permission: "wallet.view" },
    ],
  },
  {
    group: "Users",
    items: [
      { href: "/users", label: "User management", permission: "users.view" },
      { href: "/customer-service", label: "Customer service", permission: "users.view" },
      { href: "/agents", label: "Agent network", permission: "agents.view" },
    ],
  },
  {
    group: "Operations",
    items: [
      { href: "/results", label: "Result control", permission: "results.view" },
      { href: "/bets", label: "Bets", permission: "results.view" },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/wallet", label: "Deposits & withdrawals", permission: "wallet.view" },
      { href: "/payouts", label: "Withdrawals Payout", permission: "wallet.view" },
      { href: "/deposit-channels", label: "Deposit channels", permission: "wallet.approve" },
      { href: "/bonuses", label: "Bonuses & rewards", permission: "bonuses.manage" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/promo-banners", label: "Promo banners", permission: "cms.manage" },
      { href: "/cms", label: "CMS overview", permission: "cms.view" },
      { href: "/game-assets", label: "Game assets", permission: "cms.manage" },
      { href: "/gift-codes", label: "Gift codes", permission: "giftcodes.view" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/activity", label: "Activity", permission: "activity.view" },
      { href: "/staff", label: "Staff", permission: "staff.manage" },
      { href: "/predictor-keys", label: "Predictor keys", permission: "staff.manage" },
      { href: "/security", label: "Security", permission: "security.view" },
    ],
  },
] as const;

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const permissions = await getEffectivePermissions(staff);
  const prefix = getAdminPathPrefix();

  const visibleGroups = NAV_GROUPS.map((g) => ({
    group: g.group,
    items: g.items
      .filter((item) => item.permission === null || permissions.has(item.permission))
      .map((item) => ({
        ...item,
        href: `${prefix}${item.href}`,
      })),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border sticky top-0 z-40 bg-background/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 gap-4">
          <Link href={prefix} className="font-semibold tracking-tight shrink-0 pl-10 lg:pl-0">
            Lucky<span className="text-gold">Nova</span> <span className="text-muted text-sm">Admin</span>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted hidden sm:inline">
              {staff.displayName} · {staff.role}
            </span>
            <form action={logoutAction}>
              <button className="text-xs text-red hover:underline">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1 max-w-7xl w-full mx-auto flex px-4 sm:px-6">
        <AdminSidebar groups={visibleGroups} />
        <main className="flex-1 min-w-0 py-8 px-2 sm:px-0 lg:pl-6">{children}</main>
      </div>
    </div>
  );
}
