import Link from "next/link";
import { getPendingWalletRequests } from "@/lib/admin/queries";
import { approveDepositAction, rejectDepositAction, approveWithdrawAction, rejectWithdrawAction } from "@/lib/actions/admin";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { getAdminPathPrefix } from "@/lib/admin/path";

export async function PendingRequestsWidget() {
  const prefix = getAdminPathPrefix();
  const { deposits, withdraws } = await getPendingWalletRequests();
  const recentDeposits = deposits.slice(0, 5);
  const recentWithdraws = withdraws.slice(0, 5);

  if (deposits.length === 0 && withdraws.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <section className="card-surface rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Pending deposits ({deposits.length})</h2>
          <Link href={`${prefix}/wallet`} className="text-xs text-gold hover:underline">View all →</Link>
        </div>
        {recentDeposits.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
             {recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{d.user.displayName}</p>
                  <p className="text-xs text-muted">
                    {d.user.phone} · UID: <span className="font-semibold text-foreground select-all">{d.user.uid}</span> · {formatAmount(d.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <form action={approveDepositAction} className="flex items-center gap-1.5 flex-wrap">
                    <input type="hidden" name="id" value={d.id} />
                    <input
                      type="number"
                      name="customAmount"
                      placeholder="Override..."
                      className="text-xs px-2 py-1 rounded border border-border bg-background w-20 outline-none placeholder:text-[10px]"
                      step="any"
                      min="1"
                    />
                    <Button type="submit" name="isMock" value="false" className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700">Approve Real</Button>
                    <Button type="submit" name="isMock" value="true" className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700">Approve Mock</Button>
                  </form>
                  <form action={rejectDepositAction} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={d.id} />
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Remarks..."
                      className="text-xs px-2 py-1 rounded border border-border bg-background max-w-[100px] outline-none"
                    />
                    <Button type="submit" variant="danger" className="text-xs px-2 py-1 shrink-0">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-surface rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Pending withdrawals ({withdraws.length})</h2>
          <Link href={`${prefix}/wallet`} className="text-xs text-gold hover:underline">View all →</Link>
        </div>
        {recentWithdraws.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentWithdraws.map((w: any) => (
              <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2">
                <div>
                  <p className="text-sm font-medium">{w.user.displayName}</p>
                  <p className="text-xs text-muted">
                    {w.user.phone} · UID: <span className="font-semibold text-foreground select-all">{w.user.uid}</span> · Requested: <span className="font-bold text-red">{formatAmount(w.amount)}</span>
                  </p>
                  {w.userStats && (
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[9px] text-muted mt-0.5">
                      <span>Bal: <strong className="text-gold">{formatAmount(w.userStats.balance)}</strong></span>
                      <span>Total Bets: <strong className="text-foreground">{formatAmount(w.userStats.totalBets)}</strong></span>
                      <span>Recharge: <strong className="text-green">{formatAmount(w.userStats.totalRecharge)}</strong></span>
                      <span>by refer: <strong className="text-emerald-400">{formatAmount(w.userStats.totalReferralReward)}</strong></span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap shrink-0 self-end sm:self-center">
                  <form action={approveWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="isMock" value="false" />
                    <Button type="submit" className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700">Approve Real</Button>
                  </form>
                  <form action={approveWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="isMock" value="true" />
                    <Button type="submit" className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700">Approve Mock</Button>
                  </form>
                  <form action={rejectWithdrawAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <Button type="submit" variant="danger" className="text-xs px-2 py-1">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
