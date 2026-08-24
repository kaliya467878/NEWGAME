import { requirePermission } from "@/lib/admin/permissions";
import { getFinancialReports } from "@/lib/admin/queries";
import { formatAmount } from "@/lib/format";

export default async function FinancialReportsPage() {
  await requirePermission("wallet.view");

  const { today, dailyStats } = await getFinancialReports(30);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted">Daily deposits, withdrawals, and payment gateway stats (India Time - IST)</p>
        </div>
      </div>

      {/* TODAY'S METRICS SECTION */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gold">Today&apos;s Summary (आज का विवरण)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Deposits Today */}
          <div className="card-surface rounded-2xl p-6 border border-border flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted font-medium mb-1">Recharge Today (कुल आज जमा)</p>
              <p className="text-2xl font-bold text-foreground">{formatAmount(today.deposits.totalSum)}</p>
              <p className="text-xs text-muted mt-0.5">Count: {today.deposits.totalCount} requests</p>
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green font-medium">Approved</span>
                <span>{formatAmount(today.deposits.approvedSum)} <span className="text-xs text-muted">({today.deposits.approvedCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-500 font-medium">Pending</span>
                <span>{formatAmount(today.deposits.pendingSum)} <span className="text-xs text-muted">({today.deposits.pendingCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-red font-medium">Rejected</span>
                <span>{formatAmount(today.deposits.rejectedSum)} <span className="text-xs text-muted">({today.deposits.rejectedCount})</span></span>
              </div>
            </div>
          </div>

          {/* Card 2: Withdrawals Today */}
          <div className="card-surface rounded-2xl p-6 border border-border flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted font-medium mb-1">Withdraw Today (कुल आज निकासी)</p>
              <p className="text-2xl font-bold text-foreground">{formatAmount(today.withdraws.totalSum)}</p>
              <p className="text-xs text-muted mt-0.5">Count: {today.withdraws.totalCount} requests</p>
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green font-medium">Approved</span>
                <span>{formatAmount(today.withdraws.approvedSum)} <span className="text-xs text-muted">({today.withdraws.approvedCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-500 font-medium">Pending</span>
                <span>{formatAmount(today.withdraws.pendingSum)} <span className="text-xs text-muted">({today.withdraws.pendingCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-red font-medium">Rejected</span>
                <span>{formatAmount(today.withdraws.rejectedSum)} <span className="text-xs text-muted">({today.withdraws.rejectedCount})</span></span>
              </div>
            </div>
          </div>

          {/* Card 3: Sunpay Deposits Today */}
          <div className="card-surface rounded-2xl p-6 border border-border flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted font-medium mb-1">Sunpay Payin (Sunpay जमा)</p>
              <p className="text-2xl font-bold text-indigo-400">{formatAmount(today.sunpayPayin.totalSum)}</p>
              <p className="text-xs text-muted mt-0.5">Count: {today.sunpayPayin.totalCount} payins initiated</p>
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green font-medium">Success (सफल)</span>
                <span className="font-semibold text-green">{formatAmount(today.sunpayPayin.successSum)} <span className="text-xs text-muted">({today.sunpayPayin.successCount})</span></span>
              </div>
              <div className="flex justify-between text-muted text-xs">
                <span>Success Rate</span>
                <span>{today.sunpayPayin.totalCount > 0 ? Math.round((today.sunpayPayin.successCount / today.sunpayPayin.totalCount) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Sunpay Payouts Today */}
          <div className="card-surface rounded-2xl p-6 border border-border flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted font-medium mb-1">Sunpay Payout (Sunpay निकासी)</p>
              <p className="text-2xl font-bold text-indigo-400">{formatAmount(today.sunpayPayout.totalSum)}</p>
              <p className="text-xs text-muted mt-0.5">Count: {today.sunpayPayout.totalCount} payouts dispatched</p>
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-green font-medium">Success</span>
                <span>{formatAmount(today.sunpayPayout.successSum)} <span className="text-xs text-muted">({today.sunpayPayout.successCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-500 font-medium">Processing</span>
                <span>{formatAmount(today.sunpayPayout.processingSum)} <span className="text-xs text-muted">({today.sunpayPayout.processingCount})</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-red font-medium">Failed</span>
                <span>{formatAmount(today.sunpayPayout.failedSum)} <span className="text-xs text-muted">({today.sunpayPayout.failedCount})</span></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DAILY STATS TABLE SECTION */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gold">Daily Stats Breakdown (दैनिक विवरण)</h2>
        <div className="card-surface rounded-2xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-muted font-medium text-xs uppercase tracking-wider">
                  <th className="py-4 px-6">Date (IST)</th>
                  <th className="py-4 px-6">Approved Recharge</th>
                  <th className="py-4 px-6">Approved Withdraw</th>
                  <th className="py-4 px-6">Rejected Recharge</th>
                  <th className="py-4 px-6">Rejected Withdraw</th>
                  <th className="py-4 px-6 text-indigo-400">Sunpay Success Payin</th>
                  <th className="py-4 px-6 text-indigo-400">Sunpay Success Payout</th>
                  <th className="py-4 px-6 text-right">Net Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dailyStats.map((day) => {
                  const netFlow = day.approvedDepositsSum - day.approvedWithdrawalsSum;
                  return (
                    <tr key={day.date} className="hover:bg-surface/50 transition-colors">
                      <td className="py-4 px-6 font-medium whitespace-nowrap">{day.date}</td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-green">{formatAmount(day.approvedDepositsSum)}</span>
                        <span className="text-xs text-muted ml-1.5">({day.approvedDepositsCount})</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-foreground">{formatAmount(day.approvedWithdrawalsSum)}</span>
                        <span className="text-xs text-muted ml-1.5">({day.approvedWithdrawalsCount})</span>
                      </td>
                      <td className="py-4 px-6 text-muted">
                        {formatAmount(day.rejectedDepositsSum)}
                        <span className="text-xs text-muted ml-1.5">({day.rejectedDepositsCount})</span>
                      </td>
                      <td className="py-4 px-6 text-muted">
                        {formatAmount(day.rejectedWithdrawalsSum)}
                        <span className="text-xs text-muted ml-1.5">({day.rejectedWithdrawalsCount})</span>
                      </td>
                      <td className="py-4 px-6 text-indigo-300">
                        {formatAmount(day.sunpaySuccessPayinsSum)}
                        <span className="text-xs text-muted ml-1.5">({day.sunpaySuccessPayinsCount})</span>
                      </td>
                      <td className="py-4 px-6 text-indigo-300">
                        {formatAmount(day.sunpaySuccessPayoutsSum)}
                        <span className="text-xs text-muted ml-1.5">({day.sunpaySuccessPayoutsCount})</span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold whitespace-nowrap">
                        <span className={netFlow >= 0 ? "text-green" : "text-red"}>
                          {netFlow >= 0 ? "+" : ""}
                          {formatAmount(netFlow)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
