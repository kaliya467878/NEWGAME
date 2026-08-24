import { format } from "date-fns";
import { requirePermission } from "@/lib/admin/permissions";
import { getAuditLogs } from "@/lib/admin/queries";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { CsvExportBar } from "@/components/admin/CsvExportBar";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requirePermission("activity.view");
  const { action } = await searchParams;
  const logs = await getAuditLogs({ action });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Activity &amp; audit log</h1>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Live activity feed</h2>
        <LiveActivityFeed />
      </section>

      <section className="card-surface rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold">Audit log</h2>
          <CsvExportBar href="/api/admin/activity/export" extraParams={action ? { action } : undefined} />
        </div>
        <form method="get" className="flex gap-2 mb-4">
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="Filter by action (e.g. DEPOSIT_APPROVED)"
            className="flex-1 rounded-lg bg-surface-2 border border-border px-3.5 py-2 text-sm outline-none focus:border-gold/60"
          />
          <button className="rounded-lg bg-surface-2 border border-border px-4 text-sm hover:border-gold/50">
            Search
          </button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-muted">No audit log entries match.</p>
        ) : (
          <>
            {/* Mobile View */}
            <div className="flex flex-col gap-3 md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="bg-surface-2 border border-border/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-[11px] font-mono text-gold px-1.5 py-0.5 rounded bg-gold/10 border border-gold/30">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {format(new Date(log.createdAt), "d MMM, h:mm a")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-semibold tracking-wider">Actor</span>
                      <span className="text-zinc-100 font-medium">{log.actor.displayName}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-semibold tracking-wider">Target</span>
                      <span className="text-zinc-300 font-medium break-all">
                        {log.targetType}
                        {log.targetId ? `:${log.targetId.slice(0, 8)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Actor</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/60">
                      <td className="py-2 pr-4">
                        <span className="text-[11px] font-mono text-gold">{log.action}</span>
                      </td>
                      <td className="py-2 pr-4">{log.actor.displayName}</td>
                      <td className="py-2 pr-4 text-muted text-xs">
                        {log.targetType}
                        {log.targetId ? `:${log.targetId.slice(0, 8)}` : ""}
                      </td>
                      <td className="py-2 text-xs text-muted whitespace-nowrap">
                        {format(new Date(log.createdAt), "d MMM, h:mm:ss a")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
