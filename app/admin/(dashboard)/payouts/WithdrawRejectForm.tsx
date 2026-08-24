"use client";

import { useState } from "react";
import { rejectWithdrawAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function WithdrawRejectForm({ id, amount }: { id: string; amount: number }) {
  const [wager, setWager] = useState<number>(0);
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  if (!showRejectForm) {
    return (
      <Button
        type="button"
        variant="danger"
        className="text-xs px-3 py-1.5 transition-all"
        onClick={() => setShowRejectForm(true)}
      >
        Reject / Refund
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-surface-3 rounded-lg border border-red/30 max-w-[240px] text-left">
      <p className="text-[10px] text-muted font-bold">Apply wager requirement:</p>
      
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground hover:bg-gold/10 hover:border-gold/30"
          onClick={() => setWager(0)}
        >
          0x (None)
        </button>
        <button
          type="button"
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground hover:bg-gold/10 hover:border-gold/30"
          onClick={() => setWager(amount)}
        >
          1x (₹{amount.toLocaleString("en-IN")})
        </button>
        <button
          type="button"
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground hover:bg-gold/10 hover:border-gold/30"
          onClick={() => setWager(amount * 2)}
        >
          2x (₹{(amount * 2).toLocaleString("en-IN")})
        </button>
        <button
          type="button"
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground hover:bg-gold/10 hover:border-gold/30"
          onClick={() => setWager(amount * 3)}
        >
          3x (₹{(amount * 3).toLocaleString("en-IN")})
        </button>
      </div>

      <form action={rejectWithdrawAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="id" value={id} />
        <div className="flex items-center gap-1">
          <input
            type="number"
            name="wagerAmount"
            value={wager === 0 ? "" : wager}
            onChange={(e) => setWager(Number(e.target.value))}
            placeholder="Custom Wager Amount"
            className="w-full rounded bg-surface-2 border border-border px-2 py-1 text-xs text-foreground outline-none focus:border-red/50"
          />
        </div>
        <div className="flex items-center gap-1">
          <textarea
            name="remarks"
            placeholder="Rejection note (visible to user)..."
            rows={2}
            className="w-full rounded bg-surface-2 border border-border px-2 py-1 text-xs text-foreground outline-none focus:border-red/50 resize-none placeholder:text-[10px]"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="danger"
            className="text-[10px] py-1.5 font-bold flex-1"
          >
            Reject & Refund
          </Button>
          <button
            type="button"
            className="text-[10px] px-2 py-1.5 rounded bg-surface-2 border border-border hover:bg-surface-3 transition text-foreground"
            onClick={() => setShowRejectForm(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
