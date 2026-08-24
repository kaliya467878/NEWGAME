"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getWithdrawals } from "@/lib/walletApi";
import {
  formatWithdrawAmount,
  getWithdrawItemDate,
  getWithdrawItemId,
  getWithdrawMethodMeta } from "@/lib/withdrawHistory";
import PageLoader from "@/components/brand/PageLoader";

const STATUS_FILTERS = [
  { id: "All", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function WithdrawHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToastMessage("Copied to clipboard!");
    setTimeout(() => {
      setToastMessage(null);
    }, 1500);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const getOrderNumber = (item) => {
    if (!item.createdAt) return item.id;
    const d = new Date(item.createdAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const suffix = String(item.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
    return `WD${yyyy}${mm}${dd}${hh}${min}${ss}${suffix}`;
  };

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithdrawals();
      setWithdrawals(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);

    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadWithdrawals();

    return () => clearTimeout(timer);
  }, [router, loadWithdrawals]);

  const hasActiveFilters = statusFilter !== "All" || Boolean(dateFilter);

  const resetFilters = () => {
    setStatusFilter("All");
    setDateFilter("");
  };

  const filtered = withdrawals.filter((w) => {
    const matchStatus = statusFilter === "All" || w.status === statusFilter;
    const createdAt = getWithdrawItemDate(w);
    const matchDate =
      !dateFilter ||
      (createdAt && new Date(createdAt).toISOString().slice(0, 10) === dateFilter);
    return matchStatus && matchDate;
  });

  if (!mounted) {
    return <PageLoader />;
  }

  return (
    <main className="withdraw-page">
      <header className="withdraw-header center-title">
        <Link href="/wallet/withdraw" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Withdrawal history</h1>
        <button
          type="button"
          className="withdraw-history-refresh"
          onClick={loadWithdrawals}
          disabled={loading}
          aria-label="Refresh history"
        >
          ↻
        </button>
      </header>

      <section className="withdraw-history-toolbar">
        <div className="withdraw-history-toolbar-meta">
          <span className="withdraw-history-count">
            {loading ? "Loading..." : `${filtered.length} request${filtered.length === 1 ? "" : "s"}`}
          </span>
          {hasActiveFilters ? (
            <button type="button" className="withdraw-history-reset" onClick={resetFilters}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="withdraw-history-toolbar-fields">
          <select
            className="withdraw-history-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === "All" ? "All status" : item.label}
              </option>
            ))}
          </select>
          <input
            className="withdraw-history-date-inline"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
      </section>

      {loading && withdrawals.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon">↻</div>
          <p>Loading withdrawal history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon" style={{ display: "flex", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ color: "var(--theme-text-dim, #666)", margin: "0 auto 0.5rem" }}>
              <path d="M8 5.5h8v13H8V5.5Z" />
              <path d="M10 9.5h4M10 12h4M10 14.5h3" strokeLinecap="round" />
            </svg>
          </div>
          <p>No withdrawal requests found</p>
          <span className="withdraw-history-empty-hint">
            {statusFilter !== "All" || dateFilter
              ? "Try changing filters or pick another date."
              : "Your withdrawal requests will appear here."}
          </span>
          <Link href="/wallet/withdraw" className="withdraw-history-empty-link">
            New withdrawal
          </Link>
        </div>
      ) : (
        <ul className="withdraw-custom-history-list">
          {filtered.map((w) => {
            const methodMeta = getWithdrawMethodMeta(w);
            const createdAt = getWithdrawItemDate(w);
            
            let noteDetails = {};
            try {
              noteDetails = JSON.parse(w.note || "{}");
            } catch {}

            const orderNum = getOrderNumber(w);
            const remarks = w.status === "REJECTED" 
              ? (noteDetails.failureReason || "Rejected by administrator") 
              : (noteDetails.gatewayStatus === "failed" ? noteDetails.failureReason : "—");

            let formattedStatus = "Pending";
            let statusClass = "pending";
            const statusUpper = String(w.status || "").toUpperCase();

            if (statusUpper === "REJECTED") {
              formattedStatus = "Rejected";
              statusClass = "rejected";
            } else if (statusUpper === "PENDING") {
              formattedStatus = "Pending";
              statusClass = "pending";
            } else if (statusUpper === "APPROVED" && noteDetails.gatewayStatus === "success") {
              formattedStatus = "Success";
              statusClass = "success";
            } else {
              formattedStatus = "Processing";
              statusClass = "processing";
            }

            return (
              <li key={getWithdrawItemId(w)} className="withdraw-custom-history-card">
                {/* Header: Badge & Status */}
                <div className="withdraw-card-header">
                  <span className="withdraw-badge-label">Withdraw</span>
                  <span className={`withdraw-status-text ${statusClass}`}>
                    {formattedStatus}
                  </span>
                </div>

                {/* Details list */}
                <div className="withdraw-card-details">
                  <div className="withdraw-detail-row">
                    <span className="row-label">Balance</span>
                    <span className="row-value amount font-bold">₹{formatWithdrawAmount(w.amount)}</span>
                  </div>
                  
                  <div className="withdraw-detail-row">
                    <span className="row-label">Balance receive after fee</span>
                    <span className="row-value received-value font-bold">₹{formatWithdrawAmount(w.amount * 0.95)}</span>
                  </div>

                  <div className="withdraw-detail-row">
                    <span className="row-label">Type</span>
                    <span className="row-value font-medium text-[var(--theme-text)]">{methodMeta.label}</span>
                  </div>

                  <div className="withdraw-detail-row">
                    <span className="row-label">Time</span>
                    <span className="row-value text-[var(--theme-text)]">{createdAt ? formatTime(createdAt) : "—"}</span>
                  </div>

                  <div className="withdraw-detail-row">
                    <span className="row-label">Order number</span>
                    <span className="row-value order-number-copy select-all">
                      {orderNum}
                      <button
                        type="button"
                        className="copy-btn ml-1.5"
                        onClick={() => copyToClipboard(orderNum)}
                        aria-label="Copy order number"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </span>
                  </div>

                  {remarks !== "—" && remarks && (
                    <div className="withdraw-detail-row" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
                      <span className="row-label" style={{ color: "#ef4444" }}>Reason</span>
                      <span className="row-value font-semibold text-[var(--theme-text)] text-right" style={{ wordBreak: "break-word", maxWidth: "60%" }}>
                        {remarks}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toastMessage && (
        <div className="mini-toast-notification">
          {toastMessage}
        </div>
      )}

      <style jsx global>{`
        .withdraw-custom-history-list {
          padding: 0 16px 16px;
          margin: 0;
        }
        .withdraw-custom-history-card {
          background: var(--theme-bg-card);
          border: 1px solid rgba(71, 129, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          list-style: none;
          box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        }
        .withdraw-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .withdraw-badge-label {
          background: #d32f2f;
          color: var(--theme-text);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: capitalize;
          letter-spacing: 0.2px;
        }
        .withdraw-status-text {
          font-size: 14px;
          font-weight: 700;
        }
        .withdraw-status-text.pending {
          color: #d32f2f;
        }
        .withdraw-status-text.processing {
          color: #e5a93c;
        }
        .withdraw-status-text.success {
          color: #4ade80;
        }
        .withdraw-status-text.rejected {
          color: #d32f2f;
        }
        .withdraw-card-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .withdraw-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.4;
        }
        .row-label {
          color: #94a3b8;
          font-weight: 500;
          min-width: 140px;
        }
        .row-value {
          color: #cbd5e1;
          text-align: right;
          word-break: break-all;
        }
        .row-value.amount {
          color: #e5a93c;
          font-size: 14px;
        }
        .row-value.received-value {
          color: #4ade80;
          font-size: 14px;
        }
        .order-number-copy {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
        }
        .copy-btn {
          border: none;
          background: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .copy-btn:hover {
          color: var(--theme-text);
          background: rgba(255, 255, 255, 0.08);
        }
        .remarks-text {
          color: #94a3b8;
        }
        .mini-toast-notification {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--theme-bg-card);
          color: var(--theme-text);
          border: 1px solid rgba(71, 129, 255, 0.1);
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          z-index: 100000;
          animation: fade-in 0.2s ease-out;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </main>
  );
}
