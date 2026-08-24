"use client";

import { deleteStaffAction } from "@/lib/actions/staff";

export function DeleteStaffButton({ userId, displayName }: { userId: string; displayName: string }) {
  return (
    <form
      action={deleteStaffAction}
      className="mt-4 pt-4 border-t border-border"
      onSubmit={(e) => {
        if (!confirm(`Remove admin access for ${displayName}? This revokes their staff role and permissions.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="text-sm text-red hover:underline">
        Delete staff account
      </button>
    </form>
  );
}
