"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import BottomNav from "@/components/home/BottomNav";
import InviteQrModal from "@/components/share/InviteQrModal";
import ReferralIcon from "@/components/referral/ReferralIcon";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getToken } from "@/lib/auth";
import { buildInviteShareUrl, copyToClipboard } from "@/lib/clipboard";
import { BRAND_NAME } from "@/lib/brand";
import { getMyReferrals, getReferralEarnings } from "@/lib/referralApi";

const FRIENDS_PREVIEW = 5;

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit" });
};

const getInitials = (name) => {
  const parts = String(name || "P")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "P";
};

const getEarningLabel = (item) => {
  if (item.referredUser?.name) return `${item.referredUser.name} joined`;
  return item.title || "Referral reward";
};

const EARNINGS_FILTERS = [
  { id: "all", label: "All" },
  { id: "credited", label: "Credited" },
  { id: "pending", label: "Pending" },
];

function ScrollWheel({ items, value, onChange }) {
  const containerRef = useRef(null);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx !== -1 && containerRef.current && !scrolling) {
      containerRef.current.scrollTop = idx * 40;
    }
  }, [value, items, scrolling]);

  const handleScroll = (e) => {
    setScrolling(true);
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / 40);
    const val = items[index];
    if (val && val !== value) {
      onChange(val);
    }
    const timer = setTimeout(() => setScrolling(false), 150);
    return () => clearTimeout(timer);
  };

  return (
    <div
      ref={containerRef}
      className="wheel-column"
      onScroll={handleScroll}
      style={{
        height: "150px",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        textAlign: "center",
        flex: 1 }}
    >
      <div style={{ height: "55px" }} />
      {items.map((item, idx) => (
        <div
          key={item}
          className="wheel-item"
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: idx * 40, behavior: "smooth" });
              onChange(item);
            }
          }}
          style={{
            height: "40px",
            scrollSnapAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: value === item ? "bold" : "normal",
            color: value === item ? "#d4af37" : "#cccccc",
            cursor: "pointer" }}
        >
          {item}
        </div>
      ))}
      <div style={{ height: "55px" }} />
    </div>
  );
}

export default function ReferralScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [data, setData] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("gaming_platform_referral_data");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return null;
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [earningsFilter, setEarningsFilter] = useState("all");
  const [earnings, setEarnings] = useState([]);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsPages, setEarningsPages] = useState(1);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const getTodayString = () => {
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(today.getTime() + istOffset);
    return istDate.toISOString().slice(0, 10);
  };

  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempLevel, setTempLevel] = useState("all");
  const [tempYear, setTempYear] = useState("2026");
  const [tempMonth, setTempMonth] = useState("07");
  const [tempDay, setTempDay] = useState("15");
  const [tempDateAll, setTempDateAll] = useState(false);

  const loadReferrals = useCallback(async () => {
    const cached = localStorage.getItem("gaming_platform_referral_data");
    if (!cached) {
      setLoading(true);
    }
    setError("");
    try {
      const res = await getMyReferrals({ limit: 100, date: selectedDate });
      setData(res.data || null);
      if (res.data) {
        localStorage.setItem("gaming_platform_referral_data", JSON.stringify(res.data));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load referral info");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [router, selectedDate]);

  const loadEarnings = useCallback(
    async (page = 1, status = earningsFilter, append = false) => {
      setEarningsLoading(true);
      setEarningsError("");
      try {
        const params = { page, limit: 10 };
        if (status !== "all") params.status = status;
        const res = await getReferralEarnings(params);
        const nextItems = res.data?.earnings || [];
        setEarnings((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setEarningsPage(res.data?.pagination?.page || page);
        setEarningsPages(res.data?.pagination?.totalPages || 1);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
          return;
        }
        setEarningsError(err.response?.data?.message || "Failed to load earnings");
        if (!append) setEarnings([]);
      } finally {
        setEarningsLoading(false);
      }
    },
    [earningsFilter, router]
  );

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadReferrals();
  }, [loadReferrals, router]);

  useEffect(() => {
    if (!mounted || !getToken()) return;
    loadEarnings(1, earningsFilter, false);
  }, [mounted, earningsFilter, loadEarnings]);

  useEffect(() => {
    if (mounted) {
      loadReferrals();
    }
  }, [selectedDate, loadReferrals, mounted]);

  const localUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const userStr = localStorage.getItem("gaming_platform_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, []);

  const shareUrl = useMemo(() => {
    const code = data?.inviteCode || localUser?.inviteCode;
    return buildInviteShareUrl(code, data?.shareUrl);
  }, [data?.inviteCode, data?.shareUrl, localUser?.inviteCode]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const handleCopy = useCallback(
    async (text, successMessage = "Copied!") => {
      const ok = await copyToClipboard(text);
      showToast(ok ? successMessage : "Copy failed — try again");
    },
    [showToast]
  );

  const handleShare = useCallback(async () => {
    if (!shareUrl) {
      showToast("Invite link unavailable");
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${BRAND_NAME}`,
          text: `Use my invite code ${data?.inviteCode} to register`,
          url: shareUrl });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    await handleCopy(shareUrl, "Link copied!");
  }, [shareUrl, data?.inviteCode, handleCopy, showToast]);

  const summary = data?.summary;
  const agent = data?.agent;
  const referrals = data?.referrals || [];
  const isAgent = Boolean(agent);
  const availableDates = useMemo(() => {
    const dates = new Set(referrals.map((r) => r.time).filter(Boolean));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesLevel = selectedLevel === "all" || String(r.level) === selectedLevel;
      const matchesDate = selectedDate === "all" || r.time === selectedDate;
      return matchesLevel && matchesDate;
    });
  }, [referrals, selectedLevel, selectedDate]);

  const stats = useMemo(() => {
    let depositNumber = 0;
    let depositAmount = 0;
    let bettorsNumber = 0;
    let totalBetAmount = 0;
    let firstDepositCount = 0;
    let firstDepositSum = 0;

    for (const r of filteredReferrals) {
      depositNumber += r.depositNumber || 0;
      depositAmount += r.depositAmount || 0;
      if (r.totalBet > 0) {
        bettorsNumber++;
      }
      totalBetAmount += r.totalBet || 0;
      if (r.firstDepositAmount > 0) {
        firstDepositCount++;
        firstDepositSum += r.firstDepositAmount;
      }
    }

    return {
      depositNumber,
      depositAmount,
      bettorsNumber,
      totalBetAmount,
      firstDepositCount,
      firstDepositSum };
  }, [filteredReferrals]);

  // Dynamic date lists generation capped at today
  const dateConfig = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const years = [];
    for (let y = 2023; y <= currentYear; y++) {
      years.push(String(y));
    }

    const isCurrentYear = Number(tempYear) === currentYear;
    const maxMonth = isCurrentYear ? currentMonth : 12;
    const months = Array.from({ length: maxMonth }, (_, i) => String(i + 1).padStart(2, "0"));

    let maxDay = 31;
    const isCurrentMonth = isCurrentYear && Number(tempMonth) === currentMonth;
    if (isCurrentMonth) {
      maxDay = currentDay;
    } else {
      maxDay = new Date(Number(tempYear), Number(tempMonth), 0).getDate();
    }
    const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));

    return { years, months, days };
  }, [tempYear, tempMonth]);

  // Clamp date picker selection to avoid invalid/future dates
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const ty = Number(tempYear);
    const tm = Number(tempMonth);
    const td = Number(tempDay);

    if (ty === currentYear) {
      if (tm > currentMonth) {
        setTempMonth(String(currentMonth).padStart(2, "0"));
      } else if (tm === currentMonth && td > currentDay) {
        setTempDay(String(currentDay).padStart(2, "0"));
      }
    } else {
      const maxDay = new Date(ty, tm, 0).getDate();
      if (td > maxDay) {
        setTempDay(String(maxDay).padStart(2, "0"));
      }
    }
  }, [tempYear, tempMonth, tempDay]);

  if (!mounted) {
    return (
      <main className="referral-page">
        <header className="referral-header">
          <div className="referral-header-top">
            <div className="referral-back">
              <ArrowLeft size={18} />
            </div>
            <h1>Invite &amp; Earn</h1>
          </div>
          <p className="referral-header-sub">Share your code — friends join, you earn rewards</p>
        </header>
        <section className="referral-code-card" style={{ opacity: 0.5 }}>
          <span className="referral-code-label">Your invite code</span>
          <div className="referral-code-display">
            <strong className="referral-code-value">------</strong>
          </div>
        </section>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="referral-page">
      <header className="referral-header">
        <div className="referral-header-top">
          <Link href="/account" className="referral-back" aria-label="Back">
            <ArrowLeft size={18} />
          </Link>
          <h1>Invite &amp; Earn</h1>
          <span className="referral-header-spacer" aria-hidden />
        </div>
        <p className="referral-header-sub">Share your code — friends join, you earn rewards</p>
      </header>



      {toast && <div className="referral-toast">{toast}</div>}
      {error && <div className="referral-error">{error}</div>}

      <section className="referral-code-card">
        <span className="referral-code-label">
          {data?.inviteType === "agent" ? "Partner agent code" : "Your invite code"}
        </span>
        <div className="referral-code-display">
          <ReferralIcon id="sparkle" size={12} className="referral-sparkle referral-sparkle--tl" />
          <ReferralIcon id="sparkle" size={10} className="referral-sparkle referral-sparkle--tr" />
          <ReferralIcon id="sparkle" size={8} className="referral-sparkle referral-sparkle--bl" />
          <strong className="referral-code-value">{data?.inviteCode || localUser?.inviteCode || "—"}</strong>
        </div>
        <button
          type="button"
          className="referral-copy-main"
          onClick={() => handleCopy(data?.inviteCode || localUser?.inviteCode || "", "Code copied!")}
          disabled={!(data?.inviteCode || localUser?.inviteCode)}
        >
          Copy
        </button>
        {data?.inviteType === "agent" && (
          <p className="referral-code-hint">
            Agent partner code · Player code: <code>{data.referralCode}</code>
          </p>
        )}
        <div className="referral-share-actions">
          <button
            type="button"
            className="referral-share-btn primary"
            onClick={handleShare}
            disabled={!shareUrl}
          >
            Share link
          </button>
          <button
            type="button"
            className="referral-share-btn"
            onClick={() => handleCopy(shareUrl, "Link copied!")}
            disabled={!shareUrl}
          >
            Copy link
          </button>
          <button
            type="button"
            className="referral-share-btn"
            onClick={() => setQrOpen(true)}
            disabled={!shareUrl}
          >
            Show QR
          </button>
        </div>
        <p className="referral-share-url">{shareUrl || "Invite link loading..."}</p>
      </section>

      <InviteQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        shareUrl={shareUrl}
        code={data?.inviteCode}
        title={data?.inviteType === "agent" ? "Partner invite QR" : "Invite QR"}
      />

      {data?.referredBy && (
        <section className="referral-invited-by">
          <span>You were invited by</span>
          <strong>{data.referredBy.name}</strong>
          <code>{data.referredBy.referralCode}</code>
        </section>
      )}

      <section className="referral-panel referral-list-section" style={{ padding: "16px 14px", border: "1px solid var(--theme-border)" }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .wheel-column::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* CLICK TRIGGER BUTTONS */}
        <div className="flex gap-2.5 mb-4">
          <div className="flex-1">
            <button
              type="button"
              onClick={() => {
                setTempLevel(selectedLevel);
                setLevelPickerOpen(true);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--theme-border)",
                color: "var(--theme-text)",
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <span>{selectedLevel === "all" ? "All Tiers" : `Tier ${selectedLevel}`}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => {
                const [y, m, d] = selectedDate.split("-");
                setTempYear(y || "2026");
                setTempMonth(m || "07");
                setTempDay(d || "15");
                setDatePickerOpen(true);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--theme-border)",
                color: "var(--theme-text)",
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <span>{selectedDate}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* LUXURY STATS CARD */}
        <div
          style={{ borderRadius: "14px",
            padding: "16px 12px",
            marginBottom: "20px",
            border: "1px solid rgba(71, 129, 255, 0.1)",
            boxShadow: "0 8px 22px rgba(71, 129, 255, 0.1)" }}
        >
          <div className="grid grid-cols-2 gap-y-4 text-center">
            <div style={{ borderRight: "1px solid rgba(71, 129, 255, 0.1)", paddingRight: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>{stats.depositNumber}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>Deposit number</span>
            </div>
            <div style={{ paddingLeft: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>₹{stats.depositAmount.toLocaleString("en-IN")}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>Deposit amount</span>
            </div>

            <div style={{ borderTop: "1px solid rgba(71, 129, 255, 0.1)", borderRight: "1px solid rgba(71, 129, 255, 0.1)", paddingTop: "12px", paddingRight: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>{stats.bettorsNumber}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>Number of bettors</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(71, 129, 255, 0.1)", paddingTop: "12px", paddingLeft: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>₹{stats.totalBetAmount.toLocaleString("en-IN")}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>Total bet</span>
            </div>

            <div style={{ borderTop: "1px solid rgba(71, 129, 255, 0.1)", borderRight: "1px solid rgba(71, 129, 255, 0.1)", paddingTop: "12px", paddingRight: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>{stats.firstDepositCount}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>Number of people making first deposit</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(71, 129, 255, 0.1)", paddingTop: "12px", paddingLeft: "4px" }}>
              <strong style={{ display: "block", fontSize: "16px", fontWeight: "800", color: "var(--theme-green)" }}>₹{stats.firstDepositSum.toLocaleString("en-IN")}</strong>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.5)", display: "block", marginTop: "2px" }}>First deposit amount</span>
            </div>
          </div>
        </div>

        {/* DOWNLINE LIST */}
        <div className="flex justify-between items-center mb-3">
          <h2 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255, 255, 255, 0.9)" }}>Invited downline</h2>
          <span style={{ fontSize: "11px", color: "var(--theme-green)", fontWeight: "600" }}>{filteredReferrals.length} members</span>
        </div>

        {filteredReferrals.length === 0 ? (
          <p className="referral-empty">No downline members found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReferrals.map((item) => (
              <div
                key={String(item.id)}
                style={{ borderRadius: "10px",
                  border: "1px solid var(--theme-border)",
                  padding: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
              >
                {/* UID */}
                <div className="flex justify-between items-center pb-2 mb-2" style={{ borderBottom: "1px dashed rgba(255, 255, 255, 0.08)" }}>
                  <span className="flex items-center gap-1 font-semibold text-[var(--theme-text)]">
                    UID:{item.uid}
                    <button
                      type="button"
                      onClick={() => handleCopy(String(item.uid), "UID copied!")}
                      style={{ border: "none", cursor: "pointer", padding: "2px", color: "rgba(255,255,255,0.4)" }}
                      className="hover:text-[var(--theme-text)] transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </span>
                </div>

                {/* DETAILS ROWS */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Tier</span>
                    <span className="font-semibold text-[var(--theme-text)]">{item.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Deposit amount</span>
                    <span className="font-semibold text-[#ffd700]">₹{item.depositAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Commission</span>
                    <span className="font-semibold text-[#ffd700]">₹{item.commission.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Time</span>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredReferrals.length > 0 && (
              <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "11px", marginTop: "16px", paddingBottom: "10px" }}>
                No More
              </div>
            )}
          </div>
        )}
      </section>

      {/* LEVEL PICKER BOTTOM SHEET MODAL */}
      {levelPickerOpen && (
        <>
          <div 
            onClick={() => setLevelPickerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999 }}
          />
          <div 
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              maxWidth: "480px",
              margin: "0 auto",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              color: "#333",
              fontFamily: "sans-serif",
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <button 
                type="button" 
                onClick={() => setLevelPickerOpen(false)}
                style={{ border: "none", color: "var(--theme-green)", fontSize: "15px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <strong style={{ fontSize: "16px", color: "#333333" }}>Choose a tier</strong>
              <button 
                type="button" 
                onClick={() => {
                  setSelectedLevel(tempLevel);
                  setLevelPickerOpen(false);
                }}
                style={{ border: "none", color: "var(--theme-green)", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>

            <div style={{ position: "relative", height: "150px", overflow: "hidden", display: "flex", padding: "0 20px" }}>
              <div 
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  top: "55px",
                  height: "40px",
                  borderTop: "1.5px solid rgba(71, 129, 255, 0.1)",
                  borderBottom: "1.5px solid rgba(71, 129, 255, 0.1)",
                  pointerEvents: "none" }}
              />
              <ScrollWheel
                items={["all", "1", "2", "3", "4", "5", "6"]}
                value={tempLevel}
                onChange={(val) => setTempLevel(val)}
              />
            </div>
          </div>
        </>
      )}

      {/* DATE PICKER BOTTOM SHEET MODAL */}
      {datePickerOpen && (
        <>
          <div 
            onClick={() => setDatePickerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999 }}
          />
          <div 
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              maxWidth: "480px",
              margin: "0 auto",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              color: "#333",
              fontFamily: "sans-serif",
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <button 
                type="button" 
                onClick={() => setDatePickerOpen(false)}
                style={{ border: "none", color: "var(--theme-green)", fontSize: "15px", cursor: "pointer" }}
              >
                Cancel
              </button>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <strong style={{ fontSize: "16px", color: "#333333" }}>Choose a date</strong>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  setSelectedDate(`${tempYear}-${tempMonth}-${tempDay}`);
                  setDatePickerOpen(false);
                }}
                style={{ border: "none", color: "var(--theme-green)", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>

            <div 
              style={{ 
                position: "relative", 
                height: "150px", 
                overflow: "hidden", 
                display: "flex", 
                padding: "0 10px"
              }}
            >
              <div 
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  top: "55px",
                  height: "40px",
                  borderTop: "1.5px solid rgba(71, 129, 255, 0.1)",
                  borderBottom: "1.5px solid rgba(71, 129, 255, 0.1)",
                  pointerEvents: "none" }}
              />
              <ScrollWheel
                items={dateConfig.years}
                value={tempYear}
                onChange={(val) => {
                  setTempYear(val);
                }}
              />
              <ScrollWheel
                items={dateConfig.months}
                value={tempMonth}
                onChange={(val) => {
                  setTempMonth(val);
                }}
              />
              <ScrollWheel
                items={dateConfig.days}
                value={tempDay}
                onChange={(val) => {
                  setTempDay(val);
                }}
              />
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </main>
  );
}

