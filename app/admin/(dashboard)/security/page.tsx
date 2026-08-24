import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getPasswordResetRequests } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/admin/permissions";
import { ChangePasswordForm, SuspendUserButton } from "./SecurityForms";

export default async function AdminSecurityPage() {
  await requirePermission("security.view");
  
  // 1. Fetch password reset requests
  const requests = await getPasswordResetRequests();

  // 2. Fetch players sharing the same IP address for multiple account detection
  const duplicateIpGroups: any[] = await prisma.$queryRaw`
    SELECT 
      "lastLoginIp", 
      COUNT(id)::int as "count", 
      ARRAY_AGG(id::text) as "ids", 
      ARRAY_AGG(COALESCE(phone, email, '')) as "phones", 
      ARRAY_AGG(COALESCE("displayName", '')) as "names", 
      ARRAY_AGG(status::text) as "statuses"
    FROM "User"
    WHERE "lastLoginIp" IS NOT NULL AND "lastLoginIp" != '127.0.0.1' AND "lastLoginIp" != ''
    GROUP BY "lastLoginIp"
    HAVING COUNT(id) > 1
    ORDER BY COUNT(id) DESC
  `;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Security Control Center</h1>
        <p className="text-sm text-muted mt-1">Admin authentication, password resets, and multi-account detection monitoring</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side: Change Admin Password Form */}
        <section className="card-surface rounded-2xl p-6 lg:col-span-1 flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Change Admin Password</h2>
          <p className="text-xs text-muted mb-2">Update the password for your active administrator account.</p>
          <ChangePasswordForm />
        </section>

        {/* Right Side: Multiple Account Detection */}
        <section className="card-surface rounded-2xl p-6 lg:col-span-2 flex flex-col gap-4">
          <h2 className="font-semibold text-lg text-red">Multiple Account Detection Report</h2>
          <p className="text-xs text-muted mb-2">Automatically flags players who register or log in using identical IP addresses.</p>
          
          {duplicateIpGroups.length === 0 ? (
            <p className="text-sm text-muted">No multiple accounts detected. All users have unique IP addresses.</p>
          ) : (
            <div className="flex flex-col gap-6 divide-y divide-border">
              {duplicateIpGroups.map((group, index) => {
                const ids = group.ids || [];
                const names = group.names || [];
                const phones = group.phones || [];
                const statuses = group.statuses || [];

                return (
                  <div key={group.lastLoginIp} className={`pt-4 ${index === 0 ? "pt-0" : ""}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold font-mono bg-surface-3 px-2.5 py-1 rounded text-gold">
                        IP: {group.lastLoginIp}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red/10 text-red border border-red/20">
                        {group.count} Accounts Matched
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted">
                            <th className="py-2">Name</th>
                            <th className="py-2">Phone / Email</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ids.map((id: string, idx: number) => (
                            <tr key={id} className="border-b border-border/50 hover:bg-surface-2">
                              <td className="py-2.5 font-medium">{names[idx]}</td>
                              <td className="py-2.5 font-mono">{phones[idx]}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  statuses[idx] === "SUSPENDED" 
                                    ? "bg-red/10 text-red border border-red/20" 
                                    : "bg-green/10 text-green border border-green/20"
                                }`}>
                                  {statuses[idx]}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <SuspendUserButton userId={id} status={statuses[idx]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Password Reset Requests */}
      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-2">Password Reset Requests History</h2>
        <p className="text-xs text-muted mb-4">Monitor OTP password reset verification logs.</p>
        
        {requests.length === 0 ? (
          <p className="text-sm text-muted">No password reset requests yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{r.email}</p>
                  <p className="text-xs text-muted">
                    Requested {format(new Date(r.requestedAt), "d MMM yyyy, h:mm:ss a")}
                    {r.ip ? ` · ${r.ip}` : ""}
                  </p>
                </div>
                <span
                  className={
                    "text-xs font-semibold px-2.5 py-1 rounded-full border " +
                    (r.consumedAt
                      ? "border-green/40 text-green bg-green/10"
                      : "border-gold/40 text-gold bg-gold/10")
                  }
                >
                  {r.consumedAt
                    ? `Used ${format(new Date(r.consumedAt), "h:mm a")}`
                    : "Not used yet"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
