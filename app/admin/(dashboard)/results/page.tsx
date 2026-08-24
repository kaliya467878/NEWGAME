import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getResultControlData } from "@/lib/admin/queries";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { ResultModeForm, OverrideForm, K3OverrideForm, FiveDOverrideForm, CancelOverrideButton, WinningPercentageForm, BrahmastraProfitsForm } from "./ResultControlForms";
import { LiveControl } from "./LiveControl";

export default async function AdminResultsPage() {
  const staff = await requirePermission("results.view");
  const canMode = await hasPermission(staff, "results.mode");
  const canOverride = await hasPermission(staff, "results.override");
  const [{ resultMode, winningPercentage, brahmastraProfits, overrides }, k3Overrides, fivedOverrides] = await Promise.all([
    getResultControlData(),
    prisma.k3ResultOverride.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { createdBy: { select: { displayName: true } } },
    }),
    prisma.fiveDResultOverride.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { createdBy: { select: { displayName: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Result control</h1>
        <p className="text-sm text-muted mt-1">Live periods, payout exposure, and manual results for Wingo, K3 and 5D</p>
      </div>

      <LiveControl canOverride={canOverride} />

      {canMode && (
        <section className="grid md:grid-cols-3 gap-6">
          <div className="card-surface rounded-2xl p-6 flex flex-col gap-2">
            <h2 className="font-semibold text-lg">Default result mode</h2>
            <p className="text-xs text-muted mb-2">Used if no pre-generated schedule is active.</p>
            <ResultModeForm currentMode={resultMode} />
          </div>
          <div className="card-surface rounded-2xl p-6 flex flex-col gap-2">
            <h2 className="font-semibold text-lg">Winning percentage</h2>
            <p className="text-xs text-muted mb-2">Controls player win probability for random rounds.</p>
            <WinningPercentageForm currentPercentage={winningPercentage} />
          </div>
          <div className="card-surface rounded-2xl p-6 border border-red-500/20 bg-red-950/5 flex flex-col gap-2">
            <h2 className="font-semibold text-lg text-red-500 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Brahmastra Mode
            </h2>
            <p className="text-xs text-red-400/80 mb-2">Forces results that guarantee maximum platform profit.</p>
            <BrahmastraProfitsForm enabled={brahmastraProfits} />
          </div>
        </section>
      )}

      {canOverride && (
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-1">Wingo — schedule override</h2>
            <p className="text-xs text-muted mb-4">For a specific future round number.</p>
            <OverrideForm />
          </div>
          <div className="card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-1">K3 — schedule override</h2>
            <p className="text-xs text-muted mb-4">Set the three dice for a future round.</p>
            <K3OverrideForm />
          </div>
          <div className="card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-1">5D — schedule override</h2>
            <p className="text-xs text-muted mb-4">Set the five digits for a future round.</p>
            <FiveDOverrideForm />
          </div>
        </section>
      )}

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Wingo override history</h2>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted">No overrides yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border text-sm">
              {overrides.map((o) => (
                <div key={o.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p>
                      {o.mode} · #{o.roundNumber} → <span className="text-gold font-semibold">{o.number}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {o.createdBy.displayName} · {format(new Date(o.createdAt), "d MMM, h:mm a")}
                    </p>
                  </div>
                  {canOverride && <CancelOverrideButton id={o.id} type="wingo" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">K3 override history</h2>
          {k3Overrides.length === 0 ? (
            <p className="text-sm text-muted">No overrides yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border text-sm">
              {k3Overrides.map((o) => (
                <div key={o.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p>
                      {o.mode} · #{o.roundNumber} →{" "}
                      <span className="text-gold font-semibold">
                        {o.dice1}-{o.dice2}-{o.dice3}
                      </span>{" "}
                      <span className="text-muted">(sum {o.dice1 + o.dice2 + o.dice3})</span>
                    </p>
                    <p className="text-xs text-muted">
                      {o.createdBy.displayName} · {format(new Date(o.createdAt), "d MMM, h:mm a")}
                    </p>
                  </div>
                  {canOverride && <CancelOverrideButton id={o.id} type="k3" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">5D override history</h2>
          {fivedOverrides.length === 0 ? (
            <p className="text-sm text-muted">No overrides yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border text-sm">
              {fivedOverrides.map((o) => (
                <div key={o.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p>
                      {o.mode} · #{o.roundNumber} →{" "}
                      <span className="text-gold font-semibold font-mono">
                        {o.a}
                        {o.b}
                        {o.c}
                        {o.d}
                        {o.e}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {o.createdBy.displayName} · {format(new Date(o.createdAt), "d MMM, h:mm a")}
                    </p>
                  </div>
                  {canOverride && <CancelOverrideButton id={o.id} type="fived" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
