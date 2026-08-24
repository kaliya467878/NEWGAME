import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLoginForm } from "./AdminLoginForm";
import { getAdminPathPrefix } from "@/lib/admin/path";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && (user.role === "STAFF" || user.role === "SUPER_ADMIN")) {
    redirect(getAdminPathPrefix());
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gold-gradient flex items-center justify-center text-lg font-bold text-[var(--theme-text)]">
          L
        </div>
        <h1 className="text-2xl font-semibold">Lucky Nova Admin</h1>
        <p className="text-muted text-sm mt-1">Staff access only</p>
      </div>
      <AdminLoginForm />
    </main>
  );
}
