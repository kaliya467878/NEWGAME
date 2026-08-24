"use client";

import { deleteSupportIssueAction } from "@/lib/actions/admin";

export function DeleteSupportTicketButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSupportIssueAction}
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to permanently delete this complaint ticket?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border border-red/40 hover:bg-red/10 text-red font-bold text-xs px-4 py-2 rounded-xl transition duration-200"
      >
        Delete Ticket
      </button>
    </form>
  );
}
