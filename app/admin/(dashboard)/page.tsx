import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/admin/queries";
import { PERMISSION_CATALOG, hasPermission } from "@/lib/admin/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { PendingRequestsWidget } from "@/components/admin/PendingRequestsWidget";
import { getAdminPathPrefix } from "@/lib/admin/path";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const deniedLabel = denied
    ? PERMISSION_CATALOG.find((p) => p.key === denied)?.label ?? denied
    : null;
  const [stats, user] = await Promise.all([getAdminDashboardStats(), getCurrentUser()]);
  const canApproveWallet = user ? await hasPermission(user, "wallet.approve") : false;

  const prefix = getAdminPathPrefix();
  const cards = [
    { label: "Total users", value: stats.userCount },
    { label: "Bets today", value: stats.betsToday },
    { label: "Pending deposits", value: stats.pendingDeposits, href: `${prefix}/wallet` },
    { label: "Pending withdrawals", value: stats.pendingWithdraws, href: `${prefix}/wallet` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {deniedLabel && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          You don&apos;t have permission to access that area ({deniedLabel}).
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const content = (
            <div className="card-surface rounded-2xl p-6">
              <p className="text-muted text-sm">{card.label}</p>
              <p className="text-3xl font-semibold text-gold mt-1">{card.value}</p>
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {canApproveWallet && <PendingRequestsWidget />}
    </div>
  );
}
