import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { searchUsers, getUserStats } from "@/lib/admin/users";
import { CsvExportBar } from "@/components/admin/CsvExportBar";
import { UserRow } from "./UserRow";
import { prisma } from "@/lib/prisma";
import { PartnerResetButton, PartnerAdjustForm, PartnerSuspendButton } from "./PartnerControlForms";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await requirePermission("users.view");
  const canManage = await hasPermission(staff, "users.manage");
  const { q = "" } = await searchParams;

  const [users, stats, partnerUsers] = await Promise.all([
    searchUsers(q),
    getUserStats(),
    prisma.user.findMany({
      where: { isPartner: true },
      include: { wallet: true },
      orderBy: { uid: "asc" }
    })
  ]);

  const cards = [
    { label: "Total users", value: stats.total },
    { label: "Guest accounts", value: stats.guests },
    { label: "New today", value: stats.newToday },
    { label: "Suspended", value: stats.suspended, tone: stats.suspended > 0 ? "text-red" : undefined },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">User management</h1>
        <p className="text-sm text-muted mt-1">Search players, review balances, suspend or reactivate accounts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card-surface rounded-2xl p-4">
            <p className="text-xs text-muted">{c.label}</p>
            <p className={`text-xl font-semibold mt-1 ${c.tone ?? "text-foreground"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Partner Testing Accounts Live Panel */}
      <section className="card-surface rounded-2xl p-6 border border-gold/20 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg text-gold flex items-center gap-2">
            ⭐ Partner Testing Accounts Panel
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
            Mocked Deposit / Withdrawal flow active
          </span>
        </div>
        <p className="text-xs text-muted">
          Fast management controls for your partner test accounts. Deposits & withdrawals inside these accounts automatically process instantly without gateways.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2.5">UID</th>
                <th className="py-2.5">Name</th>
                <th className="py-2.5">Phone Number</th>
                <th className="py-2.5">Balance</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Quick Controls</th>
              </tr>
            </thead>
            <tbody>
              {partnerUsers.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface-2">
                  <td className="py-3 font-semibold font-mono text-gold">{u.uid}</td>
                  <td className="py-3 font-medium">{u.displayName}</td>
                  <td className="py-3 font-mono">{u.phone}</td>
                  <td className="py-3 font-bold text-foreground text-sm">
                    ₹{(u.wallet?.balance ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === "SUSPENDED" 
                        ? "bg-red/10 text-red border border-red/20" 
                        : "bg-green/10 text-green border border-green/20"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <PartnerAdjustForm userId={u.id} />
                      <PartnerResetButton userId={u.id} />
                      {canManage && <PartnerSuspendButton userId={u.id} status={u.status} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form className="card-surface rounded-2xl p-4 flex flex-wrap items-end gap-3" method="GET">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-48">
          <span className="text-muted text-xs">Search users</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Phone, name, UID, or referral code…"
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
        <button type="submit" className="rounded-xl bg-gold-gradient text-[var(--theme-text)] font-semibold px-6 py-2.5 text-sm">
          Search
        </button>
        <div className="ml-auto">
          <CsvExportBar href="/api/admin/users/export" extraParams={{ q }} />
        </div>
      </form>

      <section className="card-surface rounded-2xl p-6">
        {users.length === 0 ? (
          <p className="text-sm text-muted">No users match.</p>
        ) : (
          <div className="flex flex-col">
            {users.map((u) => (
              <UserRow key={u.id} user={{ ...u, canManage }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
