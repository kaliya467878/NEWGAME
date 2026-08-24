"use client";

import { useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { TabBar } from "@/components/ui/TabBar";
import { formatAmount } from "@/lib/format";
import { updateWithdrawalRejectReasonAction } from "@/lib/actions/admin";

type DepositRow = { id: string; amount: number; status: string; createdAt: Date; note: string | null };
type WithdrawRow = { id: string; amount: number; status: string; createdAt: Date; note: string | null };
type BetRow = { id: string; game: string; detail: string; amount: number; status: string; payout: number; createdAt: Date };
type LedgerRow = { id: string; type: string; amount: number; balanceAfter: number; createdAt: Date; meta: any };
type ReferralRow = { id: string; uid: number; displayName: string; phone: string; createdAt: Date; wallet: { balance: number } | null };

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status.startsWith("WON")
      ? "border-green/40 text-green bg-green/10"
      : status === "REJECTED" || status === "LOST"
      ? "border-red/40 text-red bg-red/10"
      : "border-gold/40 text-gold bg-gold/10";
  return <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0", tone)}>{status}</span>;
}

function getLedgerMetaText(e: LedgerRow) {
  let noteText = "";
  if (e.meta && typeof e.meta === "object") {
    const metaObj = e.meta as any;
    if (metaObj.note) noteText = metaObj.note;
    else if (metaObj.description) noteText = metaObj.description;
    else if (metaObj.reason) noteText = metaObj.reason;
    else if (metaObj.game) noteText = `Game: ${metaObj.game}`;
  }
  return noteText;
}

function getLedgerLabel(type: string) {
  switch (type) {
    case "WELCOME_BONUS": return "Welcome Bonus";
    case "DEPOSIT_APPROVED": return "Approved Deposit";
    case "DEPOSIT_BONUS": return "Deposit Bonus";
    case "WITHDRAW_APPROVED": return "Withdrawal Dispatched";
    case "WITHDRAW_REJECTED_REFUND": return "Withdrawal Refund";
    case "WITHDRAW_REQUESTED": return "Withdrawal Requested";
    case "BET_PLACED": return "Bet Staked";
    case "BET_WON": return "Bet Won";
    case "BET_LOST": return "Bet Lost";
    case "ADMIN_ADJUST": return "Admin Balance Adjustment";
    case "REWARD_CLAIMED": return "Referral Reward / Commission";
    default: return type.replace(/_/g, " ");
  }
}

export function UserDetailTabs({
  deposits,
  withdraws,
  bets,
  ledger,
  referrals,
}: {
  deposits: DepositRow[];
  withdraws: WithdrawRow[];
  bets: BetRow[];
  ledger: LedgerRow[];
  referrals: ReferralRow[];
}) {
  const [tab, setTab] = useState<"DEPOSITS" | "WITHDRAWALS" | "BETS" | "TRANSACTIONS" | "REFERRALS">("DEPOSITS");

  return (
    <div className="flex flex-col gap-4">
      <TabBar
        tabs={[
          { key: "DEPOSITS", label: `Deposits (${deposits.length})` },
          { key: "WITHDRAWALS", label: `Withdrawals (${withdraws.length})` },
          { key: "BETS", label: `Bets (${bets.length})` },
          { key: "TRANSACTIONS", label: `Transactions (${ledger.length})` },
          { key: "REFERRALS", label: `Referrals (${referrals.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "DEPOSITS" &&
        (deposits.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No deposit requests.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold">{formatAmount(d.amount)}</p>
                  <p className="text-xs text-muted">{format(d.createdAt, "d MMM yyyy, h:mm a")}</p>
                  {d.note && <p className="text-xs text-muted mt-0.5">{d.note}</p>}
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        ))}

      {tab === "WITHDRAWALS" &&
        (withdraws.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No withdrawal requests.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {withdraws.map((w) => {
              const isRejected = w.status === "REJECTED";
              let rejectReason = "";
              let noteDetails: any = {};
              try {
                noteDetails = JSON.parse(w.note || "{}");
                rejectReason = noteDetails.rejectReason || noteDetails.failureReason || "";
              } catch {}

              const orderNum = getOrderNumber(w.id, w.createdAt);
              const remarks = w.status === "REJECTED" 
                ? (noteDetails.failureReason || noteDetails.rejectReason || "Rejected by administrator") 
                : (noteDetails.gatewayStatus === "failed" ? noteDetails.failureReason : "");

              let formattedStatus = "Pending";
              let statusClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
              const statusUpper = String(w.status || "").toUpperCase();

              if (statusUpper === "REJECTED") {
                formattedStatus = "Rejected";
                statusClass = "text-red bg-red/10 border-red/20";
              } else if (statusUpper === "PENDING") {
                formattedStatus = "Pending";
                statusClass = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
              } else if (statusUpper === "APPROVED" && noteDetails.gatewayStatus === "success") {
                formattedStatus = "Success";
                statusClass = "text-green bg-green/10 border-green/20";
              } else {
                formattedStatus = "Processing";
                statusClass = "text-orange-400 bg-orange-500/10 border-orange-500/20";
              }

              return (
                <div key={w.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{formatAmount(w.amount)}</p>
                      <p className="text-xs text-muted">{format(w.createdAt, "d MMM yyyy, h:mm a")}</p>
                      {w.note && !isRejected && <p className="text-xs text-muted mt-0.5">{formatAdminNote(w.note)}</p>}
                      {isRejected && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-xs text-red/70 font-semibold">Admin Rejection Reason: {rejectReason || "None"}</span>
                          <form action={updateWithdrawalRejectReasonAction} className="flex items-center gap-1.5 mt-0.5">
                            <input type="hidden" name="withdrawId" value={w.id} />
                            <input
                              type="text"
                              name="remarks"
                              defaultValue={rejectReason}
                              placeholder="Edit reason..."
                              className="text-[10px] px-2 py-1 rounded border border-border bg-surface-2 max-w-[120px] outline-none text-foreground"
                            />
                            <button type="submit" className="text-[10px] font-semibold text-gold hover:underline px-1 py-0.5">
                              Save
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted font-bold">DB Status</span>
                      <StatusBadge status={w.status} />
                    </div>
                  </div>

                  {/* Player View Emulation Box */}
                  <div className="bg-surface-2 border border-border/85 rounded-xl p-3.5 flex flex-col gap-2 text-xs text-left max-w-lg">
                    <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Player-Facing View (यूज़र को क्या दिख रहा है)</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <p className="text-muted">Order No: <span className="text-foreground font-mono select-all font-medium">{orderNum}</span></p>
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", statusClass)}>
                        {formattedStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-muted">
                      <p>Received: <span className="text-[var(--theme-text)] font-semibold">₹{formatAmount(w.amount * 0.95)}</span></p>
                      <p>Time: <span className="text-[var(--theme-text)] font-mono">{format(w.createdAt, "yyyy-MM-dd HH:mm:ss")}</span></p>
                    </div>
                    {remarks && (
                      <p className="text-red-400 font-medium text-[11px] bg-red-950/20 border border-red-500/10 rounded px-2 py-1 mt-0.5">
                        Remarks: {remarks}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "BETS" &&
        (bets.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No bets placed.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {bets.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs text-muted font-mono">{b.game}</p>
                  <p className="text-sm font-medium">{b.detail}</p>
                  <p className="text-xs text-muted">
                    {formatAmount(b.amount)} · {format(b.createdAt, "d MMM yyyy, h:mm a")}
                  </p>
                </div>
                <StatusBadge status={b.status === "WON" ? `WON +${formatAmount(b.payout)}` : b.status} />
              </div>
            ))}
          </div>
        ))}

      {tab === "TRANSACTIONS" &&
        (ledger.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No wallet ledger transactions.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {ledger.map((e) => {
              const metaText = getLedgerMetaText(e);
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--theme-text)]">{getLedgerLabel(e.type)}</p>
                    <p className="text-xs text-muted">{format(e.createdAt, "d MMM yyyy, h:mm a")}</p>
                    {metaText && <p className="text-xs text-muted mt-0.5 italic">"{metaText}"</p>}
                  </div>
                  <div className="text-right">
                    <p className={clsx("text-sm font-semibold", e.amount > 0 ? "text-green" : "text-red")}>
                      {e.amount > 0 ? "+" : ""}{formatAmount(e.amount)}
                    </p>
                    <p className="text-[10px] text-muted">Balance: {formatAmount(e.balanceAfter)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "REFERRALS" &&
        (referrals.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No users referred yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--theme-text)]">{r.displayName || "Unknown User"}</p>
                  <p className="text-xs text-muted">
                    UID: <span className="font-semibold text-foreground select-all">{r.uid}</span> · Phone: {r.phone}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Joined: {format(r.createdAt, "d MMM yyyy, h:mm a")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted">Balance</p>
                  <p className="text-sm font-semibold text-gold">{formatAmount(r.wallet?.balance ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function formatAdminNote(noteStr: string | null) {
  if (!noteStr) return "";
  try {
    const parsed = JSON.parse(noteStr);
    if (parsed.method) {
      const details = parsed.accountDetails || {};
      if (parsed.method.toUpperCase() === "BANK") {
        return `Bank: ${details.bankName} · A/C: ${details.accountNumber} · Name: ${details.accountName}`;
      }
      if (parsed.method.toUpperCase() === "UPI") {
        return `UPI ID: ${details.upiId}`;
      }
      if (parsed.method.toUpperCase() === "USDT") {
        return `USDT Address: ${details.walletAddress || details.cryptoAddress || details.address || "N/A"}`;
      }
    }
  } catch {}
  return noteStr;
}

function getOrderNumber(id: string, createdAt: Date) {
  const d = new Date(createdAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const suffix = String(id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
  return `WD${yyyy}${mm}${dd}${hh}${min}${ss}${suffix}`;
}
