"use client";

import Link from "next/link";
import { format } from "date-fns";
import clsx from "clsx";
import { suspendUserAction, reactivateUserAction } from "@/lib/actions/users";
import { formatAmount } from "@/lib/format";

export type UserDto = {
  id: string;
  uid: number;
  displayName: string;
  phone: string;
  email: string | null;
  isGuest: boolean;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  referralCode: string;
  adminNote?: string | null;
  wallet: { balance: number } | null;
  canManage: boolean;
};

export function UserRow({ user }: { user: UserDto }) {
  const prefix = typeof window !== "undefined" ? "/" + window.location.pathname.split("/")[1] : "/admin";

  return (
    <div className="flex items-center justify-between py-3 gap-3 border-b border-border/50 last:border-0">
      <Link href={`${prefix}/users/${user.id}`} className="flex-1 min-w-0 text-left hover:text-gold transition">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{user.displayName}</p>
          {user.isGuest && (
            <span className="text-[10px] font-semibold text-muted border border-border rounded-full px-1.5 py-0.5">GUEST</span>
          )}
          <span
            className={clsx(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
              user.status === "ACTIVE" ? "border-green/40 text-green bg-green/10" : "border-red/40 text-red bg-red/10"
            )}
          >
            {user.status}
          </span>
        </div>
        <p className="text-xs text-muted truncate flex items-center gap-1.5 flex-wrap">
          <span>UID {user.uid}</span>
          {user.adminNote && (
            <span className="text-[10px] font-extrabold text-red bg-red/10 border border-red/40 px-1.5 py-0.5 rounded animate-pulse">{user.adminNote}</span>
          )}
          <span>· {user.phone} · {user.referralCode} · joined {format(user.createdAt, "d MMM yyyy")}</span>
        </p>
      </Link>
      <p className="text-sm font-semibold text-gold shrink-0">{formatAmount(user.wallet?.balance ?? 0)}</p>
      {user.canManage && (
        <form action={user.status === "ACTIVE" ? suspendUserAction : reactivateUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <button
            type="submit"
            className={clsx(
              "text-xs font-medium px-3 py-1.5 rounded-lg border shrink-0",
              user.status === "ACTIVE"
                ? "border-red/40 text-red hover:bg-red/10"
                : "border-green/40 text-green hover:bg-green/10"
            )}
          >
            {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
          </button>
        </form>
      )}
      <Link
        href={`${prefix}/users/${user.id}`}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 shrink-0"
      >
        View
      </Link>
    </div>
  );
}
