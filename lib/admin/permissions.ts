import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { User } from "@/generated/prisma/client";
import { getAdminPathPrefix } from "@/lib/admin/path";

/**
 * The catalog of permissions that CAN exist. Which staff member holds which of
 * these is stored as data (StaffPermission rows) — nothing is hardcoded per
 * account. Super admins implicitly hold every permission.
 */
export const PERMISSION_CATALOG = [
  { key: "wallet.view", label: "View wallet requests", area: "Wallet" },
  { key: "wallet.approve", label: "Approve/reject deposits & withdrawals", area: "Wallet" },
  { key: "wallet.adjust", label: "Manually adjust balances", area: "Wallet" },
  { key: "results.view", label: "View result control", area: "Results" },
  { key: "results.mode", label: "Change result mode", area: "Results" },
  { key: "results.override", label: "Set manual result overrides", area: "Results" },
  { key: "giftcodes.view", label: "View gift codes", area: "Gift codes" },
  { key: "giftcodes.manage", label: "Create/manage gift codes & event rewards", area: "Gift codes" },
  { key: "cms.view", label: "View CMS content", area: "CMS" },
  { key: "cms.manage", label: "Create/edit CMS content", area: "CMS" },
  { key: "cms.publish", label: "Publish/archive CMS content", area: "CMS" },
  { key: "security.view", label: "View security / password resets", area: "Security" },
  { key: "activity.view", label: "View activity feed & audit log", area: "Activity" },
  { key: "staff.manage", label: "Manage staff accounts & permissions", area: "Staff" },
  { key: "users.view", label: "View user directory", area: "Users" },
  { key: "users.manage", label: "Suspend/reactivate user accounts", area: "Users" },
  { key: "agents.view", label: "View agent network", area: "Agents" },
  { key: "agents.manage", label: "Create/manage partner agents", area: "Agents" },
  { key: "bonuses.manage", label: "Manage bonus & reward settings", area: "Bonuses" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export async function getStaffPermissionKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.staffPermission.findMany({ where: { userId }, select: { key: true } });
  return new Set(rows.map((r) => r.key));
}

export function isStaffUser(user: User) {
  return user.role === "STAFF" || user.role === "SUPER_ADMIN";
}

export async function hasPermission(user: User, key: PermissionKey): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role !== "STAFF") return false;
  const keys = await getStaffPermissionKeys(user.id);
  return keys.has(key);
}

/**
 * Gate for admin pages: requires a logged-in staff user who holds `key`
 * (or is super admin). Redirects to /admin/login if not staff, or /admin
 * with a message if staff but lacking the permission.
 */
export async function requirePermission(key: PermissionKey): Promise<User> {
  const user = await getCurrentUser();
  const prefix = getAdminPathPrefix();
  if (!user) {
    redirect("/login");
  }
  if (!isStaffUser(user)) {
    redirect("/");
  }
  const allowed = await hasPermission(user, key);
  if (!allowed) redirect(`${prefix}?denied=` + encodeURIComponent(key));
  return user;
}

/** For server actions: throws instead of redirecting, so a denied mutation fails loudly. */
export async function assertPermission(key: PermissionKey): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user)) throw new Error("Not authorized");
  const allowed = await hasPermission(user, key);
  if (!allowed) throw new Error(`Missing permission: ${key}`);
  return user;
}

/** The permissions a user effectively has, for building the admin nav / UI. */
export async function getEffectivePermissions(user: User): Promise<Set<string>> {
  if (user.role === "SUPER_ADMIN") return new Set(PERMISSION_CATALOG.map((p) => p.key));
  if (user.role !== "STAFF") return new Set();
  return getStaffPermissionKeys(user.id);
}
