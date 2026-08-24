import { notFound } from "next/navigation";
import { format } from "date-fns";
import clsx from "clsx";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { formatAmount } from "@/lib/format";
import { getUserDetail } from "@/lib/admin/users";
import { suspendUserAction, reactivateUserAction, toggleHoldWithdrawalsAction, updateUserWithdrawLimitsAction, toggleBypassRechargeAction, updateUserAdminNoteAction } from "@/lib/actions/users";
import { AdjustBalanceForm } from "@/app/admin/(dashboard)/wallet/AdjustBalanceForm";
import { UserDetailTabs } from "./UserDetailTabs";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { prisma } from "@/lib/prisma";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePermission("users.view");
    const canManage = await hasPermission(staff, "users.manage");
    const { id } = await params;

    const detail = await getUserDetail(id);
    if (!detail) notFound();

    const { user, deposits, withdraws, bets, ledger, referrals } = detail;
  const totalBetAmount = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon = bets.filter((b) => b.status === "WON").reduce((s, b) => s + b.payout, 0);

  // Calculate Today and Yesterday Referral Recharges in India Time (IST)
  const todayDate = new Date();
  const dateStr = todayDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const startOfIstToday = new Date(`${dateStr}T00:00:00+05:30`);
  const endOfIstToday = new Date(`${dateStr}T23:59:59+05:30`);

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateStr = yesterdayDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const startOfIstYesterday = new Date(`${yesterdayDateStr}T00:00:00+05:30`);
  const endOfIstYesterday = new Date(`${yesterdayDateStr}T23:59:59+05:30`);

  // Tier 1 direct referrals
  const tier1Users = await prisma.user.findMany({
    where: { referredById: user.id },
    select: { id: true }
  });
  const tier1Ids = tier1Users.map(u => u.id);

  // Tier 1-6 downlines (recursive)
  const downlineNetwork = await prisma.$queryRaw<{ id: string, level: number }[]>`
    WITH RECURSIVE downline AS (
      SELECT id, 1 as level 
      FROM "User" 
      WHERE "referredById" = ${user.id}
      
      UNION ALL
      
      SELECT u.id, d.level + 1
      FROM "User" u 
      JOIN downline d ON u."referredById" = d.id
      WHERE d.level < 6
    )
    SELECT id, level FROM downline
  `;
  const tier1To6Ids = downlineNetwork.map(row => row.id);

  let todayT1Recharge = 0;
  let yesterdayT1Recharge = 0;
  if (tier1Ids.length > 0) {
    const [t1Agg, t1YesterdayAgg] = await Promise.all([
      prisma.depositRequest.aggregate({
        where: {
          userId: { in: tier1Ids },
          status: "APPROVED",
          createdAt: { gte: startOfIstToday, lte: endOfIstToday }
        },
        _sum: { amount: true }
      }),
      prisma.depositRequest.aggregate({
        where: {
          userId: { in: tier1Ids },
          status: "APPROVED",
          createdAt: { gte: startOfIstYesterday, lte: endOfIstYesterday }
        },
        _sum: { amount: true }
      })
    ]);
    todayT1Recharge = t1Agg._sum.amount ?? 0;
    yesterdayT1Recharge = t1YesterdayAgg._sum.amount ?? 0;
  }

  let todayT1To6Recharge = 0;
  let yesterdayT1To6Recharge = 0;
  if (tier1To6Ids.length > 0) {
    const [t1To6Agg, t1To6YesterdayAgg] = await Promise.all([
      prisma.depositRequest.aggregate({
        where: {
          userId: { in: tier1To6Ids },
          status: "APPROVED",
          createdAt: { gte: startOfIstToday, lte: endOfIstToday }
        },
        _sum: { amount: true }
      }),
      prisma.depositRequest.aggregate({
        where: {
          userId: { in: tier1To6Ids },
          status: "APPROVED",
          createdAt: { gte: startOfIstYesterday, lte: endOfIstYesterday }
        },
        _sum: { amount: true }
      })
    ]);
    todayT1To6Recharge = t1To6Agg._sum.amount ?? 0;
    yesterdayT1To6Recharge = t1To6YesterdayAgg._sum.amount ?? 0;
  }

  // Referral Reward Earnings
  const [todayReferralRewardAgg, yesterdayReferralRewardAgg, totalReferralRewardAgg] = await Promise.all([
    prisma.reward.aggregate({
      where: {
        userId: user.id,
        type: "REFERRAL",
        status: "CLAIMED",
        createdAt: { gte: startOfIstToday, lte: endOfIstToday }
      },
      _sum: { amount: true }
    }),
    prisma.reward.aggregate({
      where: {
        userId: user.id,
        type: "REFERRAL",
        status: "CLAIMED",
        createdAt: { gte: startOfIstYesterday, lte: endOfIstYesterday }
      },
      _sum: { amount: true }
    }),
    prisma.reward.aggregate({
      where: {
        userId: user.id,
        type: "REFERRAL",
        status: "CLAIMED"
      },
      _sum: { amount: true }
    })
  ]);

  const todayReferralRewards = todayReferralRewardAgg._sum.amount ?? 0;
  const yesterdayReferralRewards = yesterdayReferralRewardAgg._sum.amount ?? 0;
  const totalReferralRewards = totalReferralRewardAgg._sum.amount ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{user.displayName}</h1>
            {user.adminNote && (
              <span className="text-xs font-extrabold text-red bg-red/10 border border-red/40 px-2.5 py-1 rounded-full animate-pulse">{user.adminNote}</span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">
            UID {user.uid} · {user.phone} · joined {format(user.createdAt, "d MMM yyyy")} · referral {user.referralCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.isGuest && (
            <span className="text-xs font-semibold text-muted border border-border rounded-full px-2.5 py-1">GUEST</span>
          )}
          <span
            className={clsx(
              "text-xs font-semibold px-2.5 py-1 rounded-full border",
              user.status === "ACTIVE" ? "border-green/40 text-green bg-green/10" : "border-red/40 text-red bg-red/10"
            )}
          >
            {user.status}
          </span>
          {user.holdWithdrawals && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-500 bg-amber-500/10">
              WITHDRAWALS HELD
            </span>
          )}
          {user.bypassRechargeCheck && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-500/40 text-indigo-400 bg-indigo-500/10">
              RECHARGE BYPASSED
            </span>
          )}
          {canManage && (
            <div className="flex gap-2">
              <form action={user.status === "ACTIVE" ? suspendUserAction : reactivateUserAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className={clsx(
                    "text-sm font-medium px-4 py-2 rounded-xl border",
                    user.status === "ACTIVE"
                      ? "border-red/40 text-red hover:bg-red/10"
                      : "border-green/40 text-green hover:bg-green/10"
                  )}
                >
                  {user.status === "ACTIVE" ? "Restrict account" : "Reactivate account"}
                </button>
              </form>
              <form action={toggleHoldWithdrawalsAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="hold" value={user.holdWithdrawals ? "false" : "true"} />
                <button
                  type="submit"
                  className={clsx(
                    "text-sm font-medium px-4 py-2 rounded-xl border transition-colors",
                    user.holdWithdrawals
                      ? "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                  )}
                >
                  {user.holdWithdrawals ? "Release Withdraw Hold" : "Hold Withdrawals"}
                </button>
              </form>
              <form action={toggleBypassRechargeAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="bypass" value={user.bypassRechargeCheck ? "false" : "true"} />
                <button
                  type="submit"
                  className={clsx(
                    "text-sm font-medium px-4 py-2 rounded-xl border transition-colors",
                    user.bypassRechargeCheck
                      ? "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                      : "border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                  )}
                >
                  {user.bypassRechargeCheck ? "Enforce First Recharge" : "Bypass First Recharge"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Admin Markdown Note Form */}
      {canManage && (
        <div className="card-surface rounded-2xl p-6 border border-gold/15 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-lg text-gold flex items-center gap-2">
              🏷️ Custom UID Badge / Markdown Note
            </h2>
            <p className="text-xs text-muted mt-1">
              Add a tag, badge or markdown note (e.g. <code className="text-red font-bold font-mono">⚠️ TWICE RECHARGE</code>, <code className="text-green font-bold">⭐ VIP</code>) for this UID. It will display next to their UID everywhere in the admin panel.
            </p>
          </div>
          <form action={updateUserAdminNoteAction} className="flex flex-col sm:flex-row gap-3 items-end">
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex-1 min-w-0 w-full">
              <label className="text-[10px] uppercase font-bold text-muted block mb-1">Markdown / Tag Note</label>
              <input
                type="text"
                name="adminNote"
                defaultValue={user.adminNote || ""}
                placeholder="e.g. ⚠️ TWICE RECHARGE"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-gold/50"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-4 py-2.5 bg-gold hover:bg-gold-500 font-semibold rounded-xl text-black transition-all w-full sm:w-auto shadow-md"
            >
              Save Tag
            </button>
          </form>
        </div>
      )}

      {/* Bound Withdrawal Accounts */}
      <div className="card-surface rounded-2xl p-6 border border-border/80 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-lg text-gold flex items-center gap-2">
            🏦 Bound Bank Cards & Payment Details ({user.withdrawalAccounts?.length || 0})
          </h2>
          <p className="text-xs text-muted mt-1">
            View or delete bound bank accounts, UPI IDs, or USDT addresses. Deleting an account lets the user re-bind a new account on the front-end.
          </p>
        </div>

        {!user.withdrawalAccounts || user.withdrawalAccounts.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center bg-surface-2/20 rounded-xl border border-dashed border-border/60">
            No bank cards, UPI accounts, or USDT addresses are currently bound to this user.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.withdrawalAccounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-surface-2/30 rounded-xl border border-border/60 flex flex-col justify-between gap-3 hover:border-gold/30 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      acc.type === "bank" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
                      acc.type === "upi" && "bg-sky-500/10 text-sky-400 border border-sky-500/25",
                      acc.type === "usdt" && "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                    )}>
                      {acc.type === "bank" ? "🏦 Bank Account" : acc.type === "upi" ? "📱 UPI ID" : "🪙 USDT Wallet"}
                    </span>
                    {acc.isPreferred && (
                      <span className="text-[9px] font-bold text-gold bg-gold/10 border border-gold/40 px-1.5 py-0.5 rounded">PREFERRED</span>
                    )}
                  </div>

                  {acc.type === "bank" && (
                    <div className="text-xs space-y-1 mt-1 text-muted">
                      <p><strong className="text-zinc-300">Bank Name:</strong> {acc.bankName || "N/A"}</p>
                      <p><strong className="text-zinc-300">A/C No:</strong> <span className="text-[var(--theme-text)] font-mono select-all">{acc.bankCardNumber}</span></p>
                      <p><strong className="text-zinc-300">Holder Name:</strong> <span className="text-[var(--theme-text)] font-medium">{acc.bankCardHolder}</span></p>
                      <p><strong className="text-zinc-300">IFSC:</strong> <span className="text-[var(--theme-text)] font-mono select-all">{acc.ifsc}</span></p>
                    </div>
                  )}

                  {acc.type === "upi" && (
                    <div className="text-xs space-y-1 mt-1 text-muted">
                      <p><strong className="text-zinc-300">UPI ID:</strong> <span className="text-[var(--theme-text)] font-mono select-all">{acc.upiId}</span></p>
                    </div>
                  )}

                  {acc.type === "usdt" && (
                    <div className="text-xs space-y-1 mt-1 text-muted">
                      <p><strong className="text-zinc-300">Network:</strong> <span className="text-[var(--theme-text)] uppercase font-bold">{acc.cryptoNetwork || "BEP20"}</span></p>
                      <p><strong className="text-zinc-300">Address:</strong> <span className="text-[var(--theme-text)] font-mono select-all break-all">{acc.cryptoAddress}</span></p>
                    </div>
                  )}
                </div>

                {canManage && (
                  <DeleteAccountButton accountId={acc.id} userId={user.id} type={acc.type} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="card-surface rounded-2xl p-4">
          <p className="text-xs text-muted font-medium">Wallet balance</p>
          <p className="text-xl font-bold mt-1.5 text-gold">{formatAmount(user.wallet?.balance ?? 0)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <p className="text-xs text-muted font-medium">Total staked</p>
          <p className="text-xl font-bold mt-1.5">{formatAmount(totalBetAmount)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <p className="text-xs text-muted font-medium">Total won</p>
          <p className="text-xl font-bold mt-1.5 text-green">{formatAmount(totalWon)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4">
          <p className="text-xs text-muted font-medium">Total Referrals</p>
          <p className="text-xl font-bold mt-1.5">{user._count.referrals}</p>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-gold/15 bg-gold/5">
          <p className="text-xs text-yellow-400 font-semibold">T1 (Today)</p>
          <p className="text-xl font-bold mt-1.5 text-yellow-400">{formatAmount(todayT1Recharge)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-gold/15 bg-gold/5">
          <p className="text-xs text-yellow-500 font-semibold">T1 (Yesterday)</p>
          <p className="text-xl font-bold mt-1.5 text-yellow-500">{formatAmount(yesterdayT1Recharge)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-indigo-500/15 bg-indigo-500/5">
          <p className="text-xs text-indigo-400 font-semibold">T1-T6 (Today)</p>
          <p className="text-xl font-bold mt-1.5 text-indigo-400">{formatAmount(todayT1To6Recharge)}</p>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-indigo-500/15 bg-indigo-500/5">
          <p className="text-xs text-indigo-500 font-semibold">T1-T6 (Yesterday)</p>
          <p className="text-xl font-bold mt-1.5 text-indigo-500">{formatAmount(yesterdayT1To6Recharge)}</p>
        </div>
      </div>

      {/* Referral Rewards Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Automatic Referral Rewards (ऑटोमैटिक रेफ़रल रिवॉर्ड)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-surface rounded-2xl p-4 border border-emerald-500/15 bg-emerald-500/5">
            <p className="text-xs text-emerald-400 font-semibold">Today&apos;s Referral Rewards (आज का रेफ़र रिवॉर्ड)</p>
            <p className="text-xl font-bold mt-1.5 text-emerald-400">{formatAmount(todayReferralRewards)}</p>
          </div>
          <div className="card-surface rounded-2xl p-4 border border-emerald-500/15 bg-emerald-500/5">
            <p className="text-xs text-emerald-500 font-semibold">Yesterday&apos;s Referral Rewards (कल का रेफ़र रिवॉर्ड)</p>
            <p className="text-xl font-bold mt-1.5 text-emerald-500">{formatAmount(yesterdayReferralRewards)}</p>
          </div>
          <div className="card-surface rounded-2xl p-4 border border-teal-500/15 bg-teal-500/5">
            <p className="text-xs text-teal-400 font-semibold">Total Referral Rewards (कुल रेफ़र रिवॉर्ड)</p>
            <p className="text-xl font-bold mt-1.5 text-teal-400">{formatAmount(totalReferralRewards)}</p>
          </div>
        </div>
      </div>

      {user.referredBy && (
        <p className="text-sm text-muted">
          Referred by <span className="text-foreground font-medium">{user.referredBy.displayName}</span> (
          {user.referredBy.referralCode})
        </p>
      )}

      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Adjust balance</h2>
            <AdjustBalanceForm defaultPhone={user.phone} />
          </section>

          <section className="card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Customize Withdrawal Limits</h2>
            <form action={updateUserWithdrawLimitsAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">
                  Daily Withdrawal Limit (Times/Day)
                </label>
                <input
                  type="number"
                  name="dailyWithdrawLimit"
                  required
                  min="0"
                  defaultValue={user.dailyWithdrawLimit ?? 3}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:border-gold/50 outline-none text-[var(--theme-text)] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">
                  Maximum Single Withdrawal Limit (INR)
                </label>
                <input
                  type="number"
                  name="maxWithdrawLimit"
                  required
                  min="0"
                  defaultValue={user.maxWithdrawLimit ?? 50000}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background focus:border-gold/50 outline-none text-[var(--theme-text)] font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="text-xs px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-[var(--theme-text)] font-semibold rounded-xl transition-all shadow-md"
                >
                  Save Limits
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Activity</h2>
        <UserDetailTabs deposits={deposits} withdraws={withdraws} bets={bets} ledger={ledger} referrals={referrals} />
      </section>
    </div>
  );
  } catch (error: any) {
    return (
      <div className="p-8 bg-red/10 border border-red/40 rounded-2xl text-red m-6 space-y-4">
        <h1 className="text-xl font-bold">⚠️ Server-Side Render Crash Exception</h1>
        <p className="text-sm font-semibold">Message: {error.message}</p>
        <pre className="text-xs bg-black/50 p-4 rounded-xl overflow-auto select-all max-h-[400px]">
          {error.stack}
        </pre>
      </div>
    );
  }
}
