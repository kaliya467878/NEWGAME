"use client";

import { useState } from "react";
import { forceFailSunpaysPayoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function SunpayPayoutFailForm({ id }: { id: string }) {
  const [reason, setReason] = useState<string>("");
  const [showFailForm, setShowFailForm] = useState<boolean>(false);

  if (!showFailForm) {
    return (
      <Button
        type="button"
        variant="danger"
        className="text-xs px-3 py-1.5 transition-all shadow-md"
        onClick={() => setShowFailForm(true)}
      >
        Mark Failed
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-surface-3 rounded-lg border border-red/30 max-w-[240px] text-left">
      <p className="text-[10px] text-muted font-bold">Mark Payout as Failed:</p>
      
      <form action={forceFailSunpaysPayoutAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="id" value={id} />
        
        <div className="flex items-center gap-1">
          <textarea
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Failure note/reason..."
            rows={2}
            required
            className="w-full rounded bg-surface-2 border border-border px-2 py-1 text-xs text-foreground outline-none focus:border-red/50 resize-none placeholder:text-[10px]"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="danger"
            className="text-[10px] py-1.5 font-bold flex-1"
          >
            Confirm Fail
          </Button>
          <button
            type="button"
            className="text-[10px] px-2 py-1.5 rounded bg-surface-2 border border-border hover:bg-surface-3 transition text-foreground"
            onClick={() => {
              setShowFailForm(false);
              setReason("");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
