import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { getAgentStats, searchAgents, AGENT_TYPE_LABELS } from "@/lib/admin/agents";
import { prisma } from "@/lib/prisma";
import { CsvExportBar } from "@/components/admin/CsvExportBar";
import { AddAgentButton, AgentRow } from "./AgentForms";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const staff = await requirePermission("agents.view");
  const canManage = await hasPermission(staff, "agents.manage");
  const { q = "", type = "", status = "" } = await searchParams;

  const [stats, agents, allAgents] = await Promise.all([
    getAgentStats(),
    searchAgents({ q, type, status }),
    prisma.agent.findMany({ select: { id: true, name: true, inviteCode: true }, orderBy: { name: "asc" } }),
  ]);

  const statCards = [
    { label: "Total partners", value: stats.total, sub: "Active network accounts" },
    { label: "Master Agent", value: stats.master, sub: "Top-level partner network" },
    { label: "Sub Agent", value: stats.sub, sub: "Reports to master agent" },
    { label: "Referral Agent", value: stats.referral, sub: "Player acquisition under sub agent" },
    { label: "Direct Affiliate", value: stats.affiliate, sub: "Standalone partner branch" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Agent network</h1>
        <p className="text-sm text-muted mt-1">
          Network model: <span className="text-violet font-medium">Master → Sub</span> |{" "}
          <span className="text-gold font-medium">Affiliate</span> parallel branch
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card-surface rounded-2xl p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-2xl font-semibold text-gold mt-1">{s.value}</p>
            <p className="text-[11px] text-muted mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Partner directory</h2>
          {canManage && <AddAgentButton parents={allAgents} />}
        </div>

        <form className="card-surface rounded-2xl p-4 flex flex-wrap items-end gap-3" method="GET">
          <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-48">
            <span className="text-muted text-xs">Search by invite code, name, or mobile</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted text-xs">Type</span>
            <select name="type" defaultValue={type} className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60">
              <option value="">All types</option>
              {Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted text-xs">Status</span>
            <select name="status" defaultValue={status} className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60">
              <option value="">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-gold-gradient text-[var(--theme-text)] font-semibold px-6 py-2.5 text-sm">
            Apply filters
          </button>
          <div className="ml-auto">
            <CsvExportBar href="/api/admin/agents/export" extraParams={{ q, type, status }} />
          </div>
        </form>

        <div className="flex flex-col gap-3">
          {agents.length === 0 && <p className="text-sm text-muted">No partners match.</p>}
          {agents.map((a) => (
            <AgentRow key={a.id} agent={a} parents={allAgents} />
          ))}
        </div>
      </section>
    </div>
  );
}
