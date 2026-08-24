import { format } from "date-fns";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { getPendingWalletRequests } from "@/lib/admin/queries";
import { getWalletReviewStats, getWalletHistory, type WalletHistoryRow } from "@/lib/admin/walletRequests";
import { approveDepositAction, rejectDepositAction, approveWithdrawAction, rejectWithdrawAction, dispatchSunpaysPayoutAction, dispatchMockPayoutAction, undoDepositAction, updateWithdrawalRejectReasonAction } from "@/lib/actions/admin";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { Button } from "@/components/ui/Button";
import { CsvExportBar } from "@/components/admin/CsvExportBar";
import { AdjustBalanceForm } from "./AdjustBalanceForm";
import { getAdminPathPrefix } from "@/lib/admin/path";
import { SortSelector } from "./SortSelector";
import { SunpaysSyncButton } from "./SunpaysSyncButton";

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: "asc" | "desc" }>;
}) {
  const staff = await requirePermission("wallet.view");
  const canAdjust = await hasPermission(staff, "wallet.adjust");
  const { q = "", sort = "desc" } = await searchParams;
  const prefix = getAdminPathPrefix();

  const [{ deposits, withdraws }, stats, depositHistory, withdrawHistory] = await Promise.all([
    getPendingWalletRequests(sort, q),
    getWalletReviewStats(),
    getWalletHistory("deposit", { q }),
    getWalletHistory("withdraw", { q }),
  ]);

  const statCards = [
    { label: "Pending deposits", value: stats.pendingDeposits, tone: "text-gold" },
    { label: "Pending withdrawals", value: stats.pendingWithdraws, tone: "text-gold" },
    { label: "Real Profit/Loss", value: formatAmount(stats.realProfits), tone: stats.realProfits >= 0 ? "text-green font-semibold" : "text-red font-semibold" },
    { label: "Real Deposits (All-time)", value: formatAmount(stats.realDepositsTotal), tone: "text-green" },
    { label: "Real Withdrawals (All-time)", value: formatAmount(stats.realWithdrawalsTotal), tone: "text-red" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Deposits &amp; withdrawals</h1>
        <p className="text-sm text-muted mt-1">Review pending requests and audit approved/rejected history.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card-surface rounded-2xl p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={clsx("text-lg font-semibold mt-1", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="card-surface rounded-2xl p-6">
        <SunpaysSyncButton />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Pending deposits ({deposits.length})</h2>
            {q && (
              <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                Filtered by: "{q}"
                <a href={prefix + "/wallet"} className="text-red font-bold hover:underline">×</a>
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <form className="flex items-center gap-1.5" method="GET">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search UID, phone, name..."
                className="text-xs rounded bg-surface-2 border border-border px-2.5 py-1.5 outline-none focus:border-gold/60 w-48"
              />
              {sort && <input type="hidden" name="sort" value={sort} />}
              <button type="submit" className="text-xs font-semibold px-3 py-1.5 bg-gold text-[var(--theme-text)] rounded hover:bg-gold/90 transition-colors">
                Search
              </button>
            </form>
            <SortSelector currentSort={sort} />
          </div>
        </div>
        {deposits.length === 0 ? (
          <p className="text-sm text-muted">No pending deposit requests.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {deposits.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                <div>
                  <p className="font-medium">{d.user.displayName}</p>
                  <p className="text-xs text-muted">
                    {d.user.phone} · UID: <span className="font-semibold text-foreground select-all">{d.user.uid}</span> · {formatAmount(d.amount)}
                  </p>
                  {(() => {
                    let noteDetails: any = {};
                    try {
                      noteDetails = JSON.parse(d.note || "{}");
                    } catch {}
                    
                    return (
                      <div className="mt-1.5 flex flex-col gap-1 text-xs">
                        {noteDetails.paymentId && (
                          <p className="text-[10px] text-muted">
                            Gateway: {noteDetails.payCurrency?.toUpperCase()} · ID: {noteDetails.paymentId} {noteDetails.gatewayStatus ? `(${noteDetails.gatewayStatus})` : ""}
                          </p>
                        )}
                        {noteDetails.txid && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted uppercase">TXID:</span>
                            <span className="font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded text-foreground select-all text-[11px]">
                              {noteDetails.txid}
                            </span>
                          </div>
                        )}
                        {noteDetails.screenshotUrl && (
                          <a
                            href={noteDetails.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline mt-1 flex items-center gap-1 text-[11px] font-medium"
                          >
                            🖼️ View Payment Proof Screenshot
                          </a>
                        )}
                        {noteDetails.manualChannelLabel && (
                          <p className="text-[10px] text-muted">
                            Method: {noteDetails.manualChannelLabel}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                  <form action={approveDepositAction} className="flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="id" value={d.id} />
                    <input
                      type="number"
                      name="customAmount"
                      placeholder="Override amount..."
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-border bg-background w-28 outline-none placeholder:text-[10px]"
                      step="any"
                      min="1"
                    />
                    <Button type="submit" name="isMock" value="false" className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700">Approve Real</Button>
                    <Button type="submit" name="isMock" value="true" className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700">Approve Mock</Button>
                  </form>
                  <form action={rejectDepositAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={d.id} />
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Remarks..."
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-border bg-background max-w-[120px] outline-none"
                    />
                    <Button type="submit" variant="danger" className="text-xs px-3 py-1.5 shrink-0">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-surface rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Pending withdrawals ({withdraws.length})</h2>
            {q && (
              <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                Filtered by: "{q}"
                <a href={prefix + "/wallet"} className="text-red font-bold hover:underline">×</a>
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <form className="flex items-center gap-1.5" method="GET">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search UID, phone, name..."
                className="text-xs rounded bg-surface-2 border border-border px-2.5 py-1.5 outline-none focus:border-gold/60 w-48"
              />
              {sort && <input type="hidden" name="sort" value={sort} />}
              <button type="submit" className="text-xs font-semibold px-3 py-1.5 bg-gold text-[var(--theme-text)] rounded hover:bg-gold/90 transition-colors">
                Search
              </button>
            </form>
          </div>
        </div>
        {withdraws.length === 0 ? (
          <p className="text-sm text-muted">No pending withdrawal requests.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {withdraws.map((w) => (
              <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                <div>
                  <p className="font-medium">{w.user.displayName}</p>
                  <p className="text-xs text-muted">
                    {w.user.phone} · UID: <span className="font-semibold text-foreground select-all">{w.user.uid}</span> · Requested: <span className="font-bold text-red">{formatAmount(w.amount)}</span>
                  </p>
                  {w.userStats && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted mt-1">
                      <span>Bal: <strong className="text-gold">{formatAmount(w.userStats.balance)}</strong></span>
                      <span>Total Bets: <strong className="text-foreground">{formatAmount(w.userStats.totalBets)}</strong></span>
                      <span>Recharge: <strong className="text-green">{formatAmount(w.userStats.totalRecharge)}</strong></span>
                      <span>by refer: <strong className="text-emerald-400">{formatAmount(w.userStats.totalReferralReward)}</strong></span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 self-end sm:self-center">
                  <form action={approveWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="isMock" value="false" />
                    <Button type="submit" className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700">Approve Real</Button>
                  </form>
                  <form action={approveWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="isMock" value="true" />
                    <Button type="submit" className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700">Approve Mock</Button>
                  </form>
                  <form action={rejectWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <Button type="submit" variant="danger" className="text-xs px-3 py-1.5">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {canAdjust && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Manual balance adjustment</h2>
          <AdjustBalanceForm />
        </section>
      )}

      <form className="card-surface rounded-2xl p-4 flex flex-wrap items-end gap-3" method="GET">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-48">
          <span className="text-muted text-xs">Search user (applies to history below)</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Phone or display name…"
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
        <button type="submit" className="rounded-xl bg-gold-gradient text-[var(--theme-text)] font-semibold px-6 py-2.5 text-sm">
          Search
        </button>
      </form>

      <section className="card-surface rounded-2xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">Deposit history</h2>
          <CsvExportBar href="/api/admin/wallet/export" extraParams={{ type: "deposit", q }} />
        </div>
        <HistoryTable rows={depositHistory} />
      </section>

      <section className="card-surface rounded-2xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">Withdrawal history</h2>
          <CsvExportBar href="/api/admin/wallet/export" extraParams={{ type: "withdraw", q }} />
        </div>
        <HistoryTable rows={withdrawHistory} isWithdraw={true} />
      </section>
    </div>
  );
}

function HistoryTable({ rows, isWithdraw = false }: { rows: WalletHistoryRow[]; isWithdraw?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <table className="w-full text-sm min-w-[600px]">
      <thead>
        <tr className="text-left text-muted text-xs border-b border-border">
          <th className="py-2 pr-4 font-medium">User</th>
          <th className="py-2 pr-4 font-medium text-right">Amount</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Reviewed by</th>
          <th className="py-2 pr-4 font-medium">When</th>
          {!isWithdraw && <th className="py-2 font-medium text-center">Action</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/50">
            <td className="py-2 pr-4">
              <p className="font-medium">{r.user.displayName}</p>
              <p className="text-xs text-muted">
                {r.user.phone} {r.user.uid ? `· UID: ${r.user.uid}` : ""}
              </p>
              {isWithdraw && r.userStats && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted mt-1 leading-none">
                  <span>Bal: <strong className="text-gold">{formatAmount(r.userStats.balance)}</strong></span>
                  <span>Bets: <strong className="text-foreground">{formatAmount(r.userStats.totalBets)}</strong></span>
                  <span>Rech: <strong className="text-green">{formatAmount(r.userStats.totalRecharge)}</strong></span>
                  <span>by refer: <strong className="text-emerald-400">{formatAmount(r.userStats.totalReferralReward)}</strong></span>
                </div>
              )}
            </td>
            <td className="py-2 pr-4 text-right">{formatAmount(r.amount)}</td>
            <td className="py-2 pr-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(() => {
                  let displayStatus = r.status;
                  let gatewayStatus = null;
                  let rejectReason = null;
                  try {
                    const parsed = JSON.parse(r.note || "{}");
                    gatewayStatus = parsed.gatewayStatus;
                    rejectReason = parsed.rejectReason;
                  } catch {}

                  if (r.status === "APPROVED") {
                    if (gatewayStatus === "success") {
                      displayStatus = "SUCCESS";
                    } else if (gatewayStatus === "processing") {
                      displayStatus = "PROCESSING";
                    }
                  }

                  return (
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={clsx(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          displayStatus === "SUCCESS" && "border-green/40 text-green bg-green/10",
                          displayStatus === "PROCESSING" && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                          displayStatus === "APPROVED" && "border-green/40 text-green bg-green/10",
                          displayStatus === "REJECTED" && "border-red/40 text-red bg-red/10"
                        )}
                      >
                        {displayStatus}
                      </span>
                      {displayStatus === "REJECTED" && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-[10px] text-red/70 max-w-[150px] break-words">
                            Reason: {rejectReason || "None"}
                          </span>
                          <form action={updateWithdrawalRejectReasonAction} className="flex items-center gap-1.5 mt-0.5">
                            <input type="hidden" name="withdrawId" value={r.id} />
                            <input
                              type="text"
                              name="remarks"
                              defaultValue={rejectReason || ""}
                              placeholder="Edit reason..."
                              className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-surface-3 max-w-[100px] outline-none text-foreground"
                            />
                            <button type="submit" className="text-[9px] font-semibold text-gold hover:underline">
                              Save
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {r.status === "APPROVED" && (
                  <span
                    className={clsx(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      r.isMock
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                    )}
                  >
                    {r.isMock ? "Mock" : "Real"}
                  </span>
                )}
                {isWithdraw && r.status === "APPROVED" && (() => {
                  let gatewayStatus = null;
                  let gateway = null;
                  try {
                    const parsed = JSON.parse(r.note || "{}");
                    gatewayStatus = parsed.gatewayStatus;
                    gateway = parsed.gateway;
                  } catch {}
                  
                  if (gatewayStatus === "processing" || gatewayStatus === "success") {
                    return (
                      <span className={clsx(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                        gateway === "mock" 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                          : "bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
                      )}>
                        {gateway === "mock" ? "Paid (Mock)" : "Paid via Sunpay"}
                      </span>
                    );
                  }
                  
                  return (
                    <div className="flex gap-1.5">
                      {!r.isMock && (
                        <form action={dispatchSunpaysPayoutAction} className="inline-block">
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" className="text-[10px] px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded text-[var(--theme-text)]">
                            Pay via Sunpay
                          </Button>
                        </form>
                      )}
                      <form action={dispatchMockPayoutAction} className="inline-block">
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" className="text-[10px] px-2 py-0.5 bg-amber-600 hover:bg-amber-700 font-semibold rounded text-[var(--theme-text)]">
                          Pay via Mock
                        </Button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </td>
            <td className="py-2 pr-4 text-xs text-muted">{r.reviewedBy?.displayName ?? "—"}</td>
            <td className="py-2 text-xs text-muted whitespace-nowrap">
              {r.reviewedAt ? format(r.reviewedAt, "d MMM, h:mm a") : "—"}
            </td>
            {!isWithdraw && (
              <td className="py-2 text-center whitespace-nowrap">
                {(r.status === "APPROVED" || r.status === "REJECTED") && (
                  <form action={undoDepositAction} className="inline-block">
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary" className="text-[10px] px-2 py-0.5 border border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold rounded">
                      Undo Action
                    </Button>
                  </form>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
