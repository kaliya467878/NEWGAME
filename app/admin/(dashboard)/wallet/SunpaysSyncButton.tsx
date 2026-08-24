"use client";

import { useState } from "react";

type DepositEntry = {
  id: string;
  uid: number;
  phone: string;
  displayName?: string;
  amount: number;
  alreadyCredited?: boolean;
};

export function SunpaysSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    approved?: number;
    fixedStatus?: number;
    skipped?: number;
    message?: string;
    safeToApprove?: DepositEntry[];
    alreadyCredited?: DepositEntry[];
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState("");
  const [showSafe, setShowSafe] = useState(false);
  const [showCredited, setShowCredited] = useState(false);

  const handleDryRun = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setShowSafe(false);
    setShowCredited(false);
    try {
      const res = await fetch("/api/admin/deposits/sunpays-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      setShowSafe(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch pending deposits");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const safeCount = result?.safeToApprove?.length ?? 0;
    const fixCount = result?.alreadyCredited?.length ?? 0;
    const msg = safeCount > 0
      ? `This will credit ${safeCount} deposit(s) and fix DB status for ${fixCount} already-credited deposit(s). Proceed?`
      : `No new deposits to credit. Will only fix DB status for ${fixCount} deposit(s). Proceed?`;
    if (!confirm(msg)) return;

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/deposits/sunpays-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      setShowSafe(false);
      setShowCredited(false);
    } catch (err: any) {
      setError(err.message || "Failed to sync deposits");
    } finally {
      setLoading(false);
    }
  };

  const safeCount = result?.safeToApprove?.length ?? 0;
  const creditedCount = result?.alreadyCredited?.length ?? 0;
  const isDryRun = !!(result?.safeToApprove || result?.alreadyCredited);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid rgba(234, 179, 8, 0.25)",
          backgroundColor: "rgba(234, 179, 8, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--theme-green)" }}>
              🔄 Sunpays Old Pending Deposits Sync
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
              Safely credits only deposits not yet paid. Already-credited deposits just get their DB status fixed.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDryRun}
              disabled={loading}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "7px",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                backgroundColor: "rgba(234, 179, 8, 0.1)",
                color: "var(--theme-green)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Loading..." : "Preview Pending"}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: "var(--theme-bg-card)",
                color: "var(--theme-text)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Syncing..." : "✅ Approve All Now"}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: "11px", color: "#f87171" }}>❌ {error}</p>
        )}

        {/* Post-sync result */}
        {result && !isDryRun && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              fontSize: "12px",
            }}
          >
            <p style={{ color: "#4ade80", fontWeight: 600 }}>{result.message}</p>
            <div style={{ color: "rgba(255,255,255,0.6)", marginTop: "4px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>✅ Credited: <strong style={{ color: "var(--theme-text)" }}>{result.approved ?? 0}</strong></span>
              <span>🔧 DB Fixed: <strong style={{ color: "var(--theme-text)" }}>{result.fixedStatus ?? 0}</strong></span>
              {(result.skipped ?? 0) > 0 && <span>⏭ Skipped: <strong style={{ color: "var(--theme-text)" }}>{result.skipped}</strong></span>}
            </div>
            {result.errors && result.errors.length > 0 && (
              <p style={{ color: "#f87171", marginTop: "4px", fontSize: "11px" }}>
                Errors: {result.errors.join("; ")}
              </p>
            )}
          </div>
        )}

        {/* Dry-run result */}
        {isDryRun && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Safe to approve */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(34, 197, 94, 0.06)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "#4ade80", fontWeight: 600 }}>
                  ✅ Will be credited: {safeCount} deposit(s)
                </p>
                {safeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSafe((v) => !v)}
                    style={{ fontSize: "11px", color: "var(--theme-green)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {showSafe ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              {showSafe && safeCount > 0 && (
                <div style={{ marginTop: "8px", maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {result.safeToApprove!.map((dep) => (
                    <div key={dep.id} style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                      <span>UID: <strong style={{ color: "var(--theme-text)" }}>{dep.uid}</strong> · <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{dep.displayName || "N/A"}</span> ({dep.phone})</span>
                      <span style={{ color: "#4ade80", fontWeight: 600 }}>₹{dep.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              )}
              {safeCount === 0 && (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "4px" }}>No new deposits to credit.</p>
              )}
            </div>

            {/* Already credited */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(249, 115, 22, 0.06)",
                border: "1px solid rgba(249, 115, 22, 0.2)",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "#fb923c", fontWeight: 600 }}>
                  🔧 Already credited (DB status stuck): {creditedCount} deposit(s)
                </p>
                {creditedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCredited((v) => !v)}
                    style={{ fontSize: "11px", color: "var(--theme-green)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {showCredited ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "2px" }}>
                These users already received their money. "Approve All Now" will only fix their DB status — no double payment.
              </p>
              {showCredited && creditedCount > 0 && (
                <div style={{ marginTop: "8px", maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {result.alreadyCredited!.map((dep) => (
                    <div key={dep.id} style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                      <span>UID: <strong style={{ color: "var(--theme-text)" }}>{dep.uid}</strong> · <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{dep.displayName || "N/A"}</span> ({dep.phone})</span>
                      <span style={{ color: "#fb923c", fontWeight: 600 }}>₹{dep.amount.toLocaleString("en-IN")} (already paid)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
