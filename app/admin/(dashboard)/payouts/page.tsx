import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/format";
import { requirePermission } from "@/lib/admin/permissions";
import { approveWithdrawAction, dispatchSunpaysPayoutAction, dispatchMockPayoutAction, forceSuccessSunpaysPayoutAction, undoSunpaysPayoutFailureAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import clsx from "clsx";
import { WithdrawRejectForm } from "./WithdrawRejectForm";
import { SunpayPayoutFailForm } from "./SunpayPayoutFailForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WithdrawalsPayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("wallet.view");
  const params = await searchParams;
  const q = params.q || "";

  const whereClause: any = {
    isMock: false,
    AND: [
      {
        OR: [
          { status: { in: ["PENDING", "APPROVED"] } },
          {
            status: "REJECTED",
            note: { contains: '"gateway":"sunpays"' }
          }
        ]
      }
    ]
  };

  if (q) {
    const isNumeric = /^\d+$/.test(q);
    whereClause.AND.push({
      user: {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          ...(isNumeric ? [{ uid: Number(q) }] : []),
        ],
      }
    });
  }

  // Fetch pending and approved real withdrawals
  const withdrawals = await prisma.withdrawRequest.findMany({
    where: whereClause,
    include: {
      user: { select: { displayName: true, phone: true, uid: true, adminNote: true } },
      reviewedBy: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch stats for each user (balance, total bets, total recharge)
  const withdrawalsWithUserStats = await Promise.all(
    withdrawals.map(async (w) => {
      const [betsAgg, approvedDeposits, rewardsAgg, wallet] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { wallet: { userId: w.userId }, type: "BET_PLACED" },
          _sum: { amount: true },
        }),
        prisma.depositRequest.findMany({
          where: { userId: w.userId, status: "APPROVED" },
          select: { channelKey: true, amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { wallet: { userId: w.userId }, type: "REWARD_CLAIMED" },
          _sum: { amount: true },
        }),
        prisma.wallet.findUnique({
          where: { userId: w.userId },
          select: { balance: true },
        }),
      ]);

      const totalRecharge = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);
      const uniqueChannels = Array.from(new Set(approvedDeposits.map(d => d.channelKey || "Manual/Null")));

      return {
        ...w,
        userStats: {
          balance: wallet?.balance ?? 0,
          totalBets: Math.abs(betsAgg._sum.amount ?? 0),
          totalRecharge: totalRecharge,
          totalReferralReward: rewardsAgg._sum.amount ?? 0,
          depositMethods: uniqueChannels.join(", ") || "None",
        },
      };
    })
  );

  // Filter out those already processed successfully or processing
  const pendingPayouts = withdrawalsWithUserStats.filter((w) => {
    if (w.status === "REJECTED") return false;
    if (w.status === "PENDING") return true;
    try {
      const noteDetails = JSON.parse(w.note || "{}");
      return noteDetails.gatewayStatus !== "processing" && noteDetails.gatewayStatus !== "success";
    } catch {
      return true;
    }
  });

  // Filter for withdrawals dispatched to Sunpays (processing, success, or failed)
  const sunpayPayouts = withdrawalsWithUserStats.filter((w) => {
    try {
      const noteDetails = JSON.parse(w.note || "{}");
      return noteDetails.gateway === "sunpays";
    } catch {
      return false;
    }
  });

  // Calculate statistics
  const totalPendingCount = pendingPayouts.length;
  const totalPendingAmount = pendingPayouts.reduce((sum, w) => sum + w.amount, 0);

  const totalApprovedCount = withdrawalsWithUserStats.filter((w) => w.status === "APPROVED").length;
  const totalApprovedAmount = withdrawalsWithUserStats.filter((w) => w.status === "APPROVED").reduce((sum, w) => sum + w.amount, 0);

  const totalRejectedCount = withdrawalsWithUserStats.filter((w) => w.status === "REJECTED").length;

  const totalSunpaySentCount = sunpayPayouts.length;
  const totalSunpaySentAmount = sunpayPayouts.reduce((sum, w) => sum + w.amount, 0);

  const totalSunpaySuccessCount = sunpayPayouts.filter((w) => {
    if (w.status === "APPROVED") return true;
    try {
      const parsed = JSON.parse(w.note || "{}");
      return parsed.gatewayStatus === "success";
    } catch {
      return false;
    }
  }).length;

  const totalSunpaySuccessAmount = sunpayPayouts.filter((w) => {
    if (w.status === "APPROVED") return true;
    try {
      const parsed = JSON.parse(w.note || "{}");
      return parsed.gatewayStatus === "success";
    } catch {
      return false;
    }
  }).reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Withdrawals Payout</h1>
          <p className="text-sm text-muted">Manage pending withdrawal verifications and approved payouts</p>
        </div>
      </header>

      {/* Statistical overview row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending */}
        <div className="card-surface rounded-2xl p-5 border border-amber-500/20">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">⏳ Pending Withdrawals</p>
          <p className="text-2xl font-bold mt-1.5 text-amber-500">₹{totalPendingAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted mt-1">{totalPendingCount} requests waiting review</p>
        </div>

        {/* Card 2: Approved (Total) */}
        <div className="card-surface rounded-2xl p-5 border border-green/20">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">✅ Approved (Total)</p>
          <p className="text-2xl font-bold mt-1.5 text-green">₹{totalApprovedAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted mt-1">{totalApprovedCount} payouts completed</p>
        </div>

        {/* Card 3: Sent to Sunpay */}
        <div className="card-surface rounded-2xl p-5 border border-indigo-500/20">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">🏦 Sent to Sunpay</p>
          <p className="text-2xl font-bold mt-1.5 text-indigo-400">₹{totalSunpaySentAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted mt-1">{totalSunpaySentCount} dispatched requests</p>
        </div>

        {/* Card 4: Sunpay Success & Rejected */}
        <div className="card-surface rounded-2xl p-5 border border-border/80">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">📊 Sunpay Success / Reject</p>
          <p className="text-2xl font-bold mt-1.5 text-zinc-100">
            ₹{totalSunpaySuccessAmount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted mt-1">
            {totalSunpaySuccessCount} success · {totalRejectedCount} rejected
          </p>
        </div>
      </div>

      <section className="card-surface rounded-2xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-semibold text-lg">Pending Withdrawals & Payouts ({pendingPayouts.length})</h2>
          <form className="flex items-center gap-1.5 ml-auto">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search user, phone, UID..."
              className="text-xs px-3 py-1.5 rounded-xl border border-border bg-background w-56 outline-none focus:border-gold/50"
            />
            <Button type="submit" className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[var(--theme-text)] font-semibold rounded transition-all">Search</Button>
          </form>
          {q && (
            <Link
              href="?"
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-3 hover:bg-surface-4 text-muted hover:text-[var(--theme-text)] transition-colors"
            >
              Clear filter "{q}" ×
            </Link>
          )}
        </div>
        {pendingPayouts.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center bg-surface-2/20 rounded-xl border border-dashed border-border/60">
            No withdrawal requests are currently waiting.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-muted text-xs border-b border-border">
                <th className="py-3 pr-4 font-medium">User Details</th>
                <th className="py-3 pr-4 font-medium">Account Details</th>
                <th className="py-3 pr-4 font-medium text-right">Requested</th>
                <th className="py-3 pr-4 font-medium text-right">Payout (95%)</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Reviewed By</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map((w) => {
                let noteDetails: any = {};
                try {
                  noteDetails = JSON.parse(w.note || "{}");
                } catch {}

                const method = String(noteDetails.method || "").toUpperCase();
                const accountDetails = noteDetails.accountDetails || {};

                return (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-surface-2/10 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--theme-text)]">{w.user.displayName}</p>
                      <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                        <span>UID: {w.user.uid}</span>
                        {w.user.adminNote && (
                          <span className="text-[9px] font-extrabold text-red bg-red/10 border border-red/40 px-1 py-0.5 rounded animate-pulse">{w.user.adminNote}</span>
                        )}
                        <span>· {w.user.phone}</span>
                      </p>
                      {w.userStats && (
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted mt-1.5">
                          <span>Bal: <strong className="text-gold">{formatAmount(w.userStats.balance)}</strong></span>
                          <span>Bets: <strong className="text-foreground">{formatAmount(w.userStats.totalBets)}</strong></span>
                          <span>Rech: <strong className="text-green">{formatAmount(w.userStats.totalRecharge)} ({w.userStats.depositMethods})</strong></span>
                          <span>by refer: <strong className="text-emerald-400">{formatAmount(w.userStats.totalReferralReward)}</strong></span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-gold">{method}</p>
                        {method === "UPI" && (
                          <p className="text-muted">UPI ID: <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.upiId}</span></p>
                        )}
                        {method === "BANK" && (
                          <>
                            <p className="text-muted">Bank: <span className="text-[var(--theme-text)] font-medium">{accountDetails.bankName}</span></p>
                            <p className="text-muted">A/C: <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.accountNumber}</span></p>
                            <p className="text-muted">IFSC: <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.ifsc}</span></p>
                            <p className="text-muted">Name: <span className="text-[var(--theme-text)] font-medium">{accountDetails.accountName}</span></p>
                          </>
                        )}
                        {method === "USDT" && (
                          <>
                            <p className="text-muted">Address: <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.walletAddress || accountDetails.cryptoAddress || accountDetails.address || "N/A"}</span></p>
                            <p className="text-muted">USDT Amount: <span className="text-[var(--theme-text)] font-medium">{accountDetails.usdtAmount} USDT</span></p>
                          </>
                        )}
                        {noteDetails.gatewayStatus === "failed" && (
                          <div className="text-[10px] text-red-500 font-semibold bg-red-500/10 border border-red-500/20 rounded p-1.5 mt-2 max-w-[250px] whitespace-pre-wrap select-all text-left">
                            Failed: {noteDetails.failureReason || "Sunpays dispatch failed"}
                          </div>
                        )}
                        {noteDetails.gatewayStatus === "processing" && (
                          <div className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 rounded p-1.5 mt-2 animate-pulse text-left">
                            Processing Payout...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-[var(--theme-text)]">
                      {formatAmount(w.amount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-green">
                      {formatAmount(Math.round(w.amount * 0.95 * 100) / 100)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={clsx(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        w.status === "PENDING" && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                        w.status === "APPROVED" && "border-green/40 text-green bg-green/10",
                        w.status === "REJECTED" && "border-red/40 text-red bg-red/10"
                      )}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted">
                      {w.status === "APPROVED" ? (
                        <>
                          <p>{w.reviewedBy?.displayName ?? "—"}</p>
                          <p className="text-[10px]">
                            {w.reviewedAt ? format(new Date(w.reviewedAt), "d MMM, h:mm a") : "—"}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted italic">Not reviewed yet</p>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {w.status === "PENDING" ? (
                          <>
                            <form action={approveWithdrawAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <input type="hidden" name="isMock" value="false" />
                              <Button type="submit" className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-semibold rounded text-[var(--theme-text)] transition-all">
                                Approve Real
                              </Button>
                            </form>
                            <form action={approveWithdrawAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <input type="hidden" name="isMock" value="true" />
                              <Button type="submit" className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 font-semibold rounded text-[var(--theme-text)] transition-all">
                                Approve Mock
                              </Button>
                            </form>
                             <WithdrawRejectForm id={w.id} amount={w.amount} />
                          </>
                        ) : (
                          <>
                            <form action={dispatchSunpaysPayoutAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <Button type="submit" className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded text-[var(--theme-text)] shadow-md transition-all">
                                Send to Sunpay
                              </Button>
                            </form>
                            <form action={dispatchMockPayoutAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <Button type="submit" className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 font-semibold rounded text-[var(--theme-text)] shadow-md transition-all">
                                Pay Mock
                              </Button>
                            </form>
                             <WithdrawRejectForm id={w.id} amount={w.amount} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Sunpay Outbound Payouts Tracker */}
      <section className="card-surface rounded-2xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-semibold text-lg text-indigo-400 flex items-center gap-2">
            <span>🏦</span> Sunpay Dispatched Payouts Tracker ({sunpayPayouts.length})
          </h2>
        </div>
        {sunpayPayouts.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center bg-surface-2/20 rounded-xl border border-dashed border-border/60">
            No payouts have been dispatched via Sunpays yet.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-muted text-xs border-b border-border">
                <th className="py-3 pr-4 font-medium">User Details</th>
                <th className="py-3 pr-4 font-medium">Bank / Beneficiary Details</th>
                <th className="py-3 pr-4 font-medium text-right">Net Payout (95%)</th>
                <th className="py-3 pr-4 font-medium">Gateway Status</th>
                <th className="py-3 pr-4 font-medium">Dispatched At</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sunpayPayouts.map((w) => {
                let noteDetails: any = {};
                try {
                  noteDetails = JSON.parse(w.note || "{}");
                } catch {}

                const method = String(noteDetails.method || "").toUpperCase();
                const accountDetails = noteDetails.accountDetails || {};
                const gatewayStatus = noteDetails.gatewayStatus || "unknown";

                return (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-surface-2/10 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--theme-text)]">{w.user.displayName}</p>
                      <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                        <span>UID: {w.user.uid}</span>
                        {w.user.adminNote && (
                          <span className="text-[9px] font-extrabold text-red bg-red/10 border border-red/40 px-1 py-0.5 rounded animate-pulse">{w.user.adminNote}</span>
                        )}
                        <span>· {w.user.phone}</span>
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-xs space-y-0.5">
                        <p className="text-muted"><strong className="text-gold">BANK NAME:</strong> <span className="text-[var(--theme-text)] font-medium">{accountDetails.bankName || "N/A"}</span></p>
                        <p className="text-muted"><strong className="text-gold">A/C NO:</strong> <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.accountNumber}</span></p>
                        <p className="text-muted"><strong className="text-gold">IFSC CODE:</strong> <span className="text-[var(--theme-text)] mono select-all font-medium">{accountDetails.ifsc}</span></p>
                        <p className="text-muted"><strong className="text-gold">BENEFICIARY NAME:</strong> <span className="text-[var(--theme-text)] font-medium">{accountDetails.accountName}</span></p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-green">
                      {formatAmount(Math.round(w.amount * 0.95 * 100) / 100)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={clsx(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase",
                        gatewayStatus === "success" && "border-green/40 text-green bg-green/10",
                        gatewayStatus === "processing" && "border-amber-500/40 text-amber-500 bg-amber-500/10 animate-pulse",
                        gatewayStatus === "failed" && "border-red/40 text-red bg-red/10"
                      )}>
                        {gatewayStatus}
                      </span>
                      {noteDetails.failureReason && (
                        <p className="text-[10px] text-red-400 mt-1 max-w-[200px] whitespace-pre-wrap select-all">{noteDetails.failureReason}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted">
                      {noteDetails.submittedAt ? format(new Date(noteDetails.submittedAt), "d MMM, h:mm a") : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end items-center gap-2 flex-wrap">
                        {w.status === "REJECTED" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red font-semibold italic">Failed & Refunded</span>
                            <form action={undoSunpaysPayoutFailureAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <button
                                type="submit"
                                className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 font-semibold rounded text-[var(--theme-text)] shadow-md transition-all whitespace-nowrap"
                              >
                                Revert to Processing (Undo)
                              </button>
                            </form>
                          </div>
                        ) : gatewayStatus !== "success" ? (
                          <>
                            {gatewayStatus !== "failed" && <SunpayPayoutFailForm id={w.id} />}
                            <form action={forceSuccessSunpaysPayoutAction}>
                              <input type="hidden" name="id" value={w.id} />
                              <button
                                type="submit"
                                className="text-xs px-3 py-1.5 bg-green hover:bg-green-600 font-semibold rounded text-[var(--theme-text)] shadow-md transition-all whitespace-nowrap"
                              >
                                Force Success
                              </button>
                            </form>
                          </>
                        ) : (
                          <span className="text-xs text-muted italic">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
