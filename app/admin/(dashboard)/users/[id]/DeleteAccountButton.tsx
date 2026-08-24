"use client";

import { deleteWithdrawalAccountAction } from "@/lib/actions/users";

export function DeleteAccountButton({ 
  accountId, 
  userId, 
  type 
}: { 
  accountId: string; 
  userId: string; 
  type: string; 
}) {
  return (
    <form 
      action={deleteWithdrawalAccountAction}
      onSubmit={(e) => {
        if (!confirm(`Are you absolutely sure you want to delete this bound ${type.toUpperCase()} card/account? The user will have to add a new one.`)) {
          e.preventDefault();
        }
      }}
      className="mt-2"
    >
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="text-[10px] w-full py-1.5 border border-red/40 hover:bg-red/10 text-red font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        🗑️ Delete Card/Account
      </button>
    </form>
  );
}
