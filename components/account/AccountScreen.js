"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import AnnouncementsModal from "@/components/home/AnnouncementsModal";
import AccountSheet from "@/components/account/AccountSheet";
import AccountIcon from "@/components/account/AccountIcon";
import { getStoredAvatar } from "@/lib/userPreferences";
import { getAgentStatus } from "@/lib/agentApi";
import { clearAuth, getToken, getUser, isPartnerUser, setUser } from "@/lib/auth";
import { getBalance } from "@/lib/walletApi";
import { getNotifications, getProfile } from "@/lib/userApi";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getAnnouncements, getVipProgram } from "@/lib/platformApi";
import { Odometer } from "@/components/Odometer";

const QUICK_ACTIONS = [
  { iconId: "wallet", label: "Wallet", href: "/wallet" },
  { iconId: "deposit", label: "Deposit", href: "/wallet/deposit" },
  { iconId: "withdraw", label: "Withdraw", href: "/wallet/withdraw" },
  { iconId: "invite-friends", label: "Invite", href: "/referral" },
];

const HISTORY_ITEMS = [
  { iconId: "game-history", href: "/games/history", title: "Game History", sub: "My game history", color: "blue" },
  { iconId: "transaction", href: "/wallet/transactions", title: "Transaction", sub: "My transaction history", color: "green" },
  { iconId: "deposit-history", href: "/wallet/deposit/history", title: "Deposit", sub: "My deposit history", color: "red" },
  { iconId: "withdraw-history", href: "/wallet/withdraw/history", title: "Withdraw", sub: "My withdraw history", color: "orange" },
];

const KYC_LABELS = {
  pending: "KYC pending",
  verified: "KYC verified",
  rejected: "KYC rejected" };

const BASE_SETTINGS_ITEMS = [
  { iconId: "edit-profile", label: "Edit profile", href: "/account/profile" },
  { iconId: "security", label: "Security", href: "/account/security" },
  { iconId: "notifications", label: "Notifications", href: "/account/notifications", showUnread: true },
  { iconId: "invite-friends", label: "Invite friends", href: "/referral" },
  { iconId: "gifts", label: "Gifts", href: "/account/gifts" },
  { iconId: "game-stats", label: "Game statistics", href: "/games/history" },
];

const SERVICE_ITEMS = [
  { iconId: "announcement", label: "Announcement", action: "announcement" },
  { iconId: "customer-service", label: "Customer Service", href: "/support" },
  { iconId: "feedback", label: "Feedback", href: "/account/feedback" },
  { iconId: "guide", label: "Beginner's Guide", href: "/account/guide" },
  { iconId: "about", label: "About us", href: "/about" },
];

export default function AccountScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [user, setUserState] = useState(null);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [avatar, setAvatar] = useState("👤");
  const [unreadCount, setUnreadCount] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState("");
  const [announcementItems, setAnnouncementItems] = useState([]);
  const [announcementMarquee, setAnnouncementMarquee] = useState(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [vipProgram, setVipProgram] = useState(null);

  const loadBalance = useCallback(async () => {
    try {
      const res = await getBalance();
      setBalance(res.data.balance);
      localStorage.setItem("lastBalance", String(res.data.balance));
    } catch {
      setBalance(0);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      const profile = res.data;
      setUserState(profile);
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, ...profile });
      }
    } catch {
      const storedUser = getUser();
      if (storedUser) setUserState(storedUser);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await getNotifications({ limit: 1 });
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const syncPartnerAccess = useCallback(async () => {
    const storedUser = getUser();
    if (isPartnerUser(storedUser)) {
      setIsPartner(true);
      return;
    }

    try {
      const res = await getAgentStatus();
      const status = res.data;
      if (status?.isAgent) {
        setIsPartner(true);
        if (storedUser) {
          const nextUser = {
            ...storedUser,
            agentProfile: {
              id: status.id,
              status: status.status,
              agentType: status.agentType,
              agentCode: status.agentCode } };
          setUser(nextUser);
          setUserState((prev) => ({ ...(prev || storedUser), ...nextUser }));
        }
        return;
      }
    } catch {
      // non-partner
    }

    setIsPartner(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (typeof window !== "undefined") {
      const cached = Number(window.localStorage.getItem("lastBalance"));
      if (Number.isFinite(cached)) {
        setBalance(cached);
      }
    }

    setAvatar(getStoredAvatar());
    loadBalance();
    loadProfile();
    loadUnreadCount();
    syncPartnerAccess();

    let activeSocket = null;
    let cancelled = false;

    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") {
        setBalance(data.balance);
      }
    };

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("join:user");
      socket.on("wallet:updated", onWalletUpdated);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [router, loadBalance, loadProfile, loadUnreadCount, syncPartnerAccess]);

  useEffect(() => {
    let cancelled = false;
    getAnnouncements()
      .then((res) => {
        if (cancelled) return;
        const items = res?.data?.items;
        if (Array.isArray(items)) {
          setAnnouncementItems(items);
        }
        const nextMarquee = res?.data?.marquee;
        if (nextMarquee?.text) {
          setAnnouncementMarquee(nextMarquee);
        } else if (nextMarquee === null) {
          setAnnouncementMarquee(null);
        }
      })
      .catch(() => {
        /* keep empty — AccountSheet shows fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVipProgram()
      .then((res) => {
        if (!cancelled) setVipProgram(res?.data || { enabled: false });
      })
      .catch(() => {
        if (!cancelled) setVipProgram({ enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showVipUi = Boolean(vipProgram?.enabled);
  const showVipBadge = showVipUi && vipProgram?.showBadge !== false;
  const showVipQuickAction = showVipUi && vipProgram?.showQuickAction !== false;
  const vipLevelLabel = vipProgram?.defaultLevel || "VIP0";

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => !action.vipAction || showVipQuickAction),
    [showVipQuickAction]
  );

  const settingsItems = useMemo(() => {
    const base = [...BASE_SETTINGS_ITEMS];
    if (isPartner) {
      return [{ iconId: "partner", label: "Partner portal", href: "/agent" }, ...base];
    }
    return base;
  }, [isPartner]);

  const handleSettingsAction = (item) => {
    if (item.action === "coming-soon") {
      setSheet({ type: "coming-soon", text: item.comingSoonText });
      return;
    }
    if (item.action === "announcement") {
      setAnnouncementModalOpen(true);
    }
  };

  const handleServiceAction = (item) => {
    if (item.href) return;
    handleSettingsAction(item);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBalance(), loadProfile(), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    disconnectSocket();
    clearAuth();
    router.replace("/login");
  };

  const copyUid = () => {
    const numericUid = user?.uid || user?.id || "";
    if (numericUid) {
      navigator.clipboard.writeText(String(numericUid));
      setToast("UID copied");
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  const displayName = user?.name || "Member";
  const uid = user?.uid ? String(user.uid) : user?.id ? String(user.id).slice(-7) : "0000000";
  const lastLogin = user?.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true })
    : user?.createdAt
      ? new Date(user.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true })
      : "—";
  const displayAvatar = avatar === "👤" ? "😎" : avatar;
  const kycStatus = user?.kycStatus || "pending";

  return (
    <main className="account-page">
      <section className="account-profile-header">
        <div className="account-profile-row">
          <Link href="/account/profile" className="account-avatar account-profile-link" style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            {renderAvatarSvg(avatar, 30)}
          </Link>
          <div className="account-profile-info">
            <div className="account-name-row">
              <Link href="/account/profile" className="account-profile-name-link">
                <h1>{displayName.toUpperCase()}</h1>
              </Link>
              {showVipBadge ? <span className="account-vip">{vipLevelLabel}</span> : null}
            </div>
            <button type="button" className="account-uid" onClick={copyUid}>
              UID {uid}
              <span className="account-uid-copy" aria-hidden="true">
                ⧉
              </span>
            </button>
            <p className="account-last-login">Last login: {lastLogin}</p>
          </div>
        </div>
      </section>
 
      <section className="account-balance-card">
        <div className="account-balance-top">
          <span>Total balance</span>
          <button type="button" className="account-refresh" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh balance">
            <span className={refreshing ? "account-refresh-spin" : ""}>{refreshing ? "↻" : "↺"}</span>
          </button>
        </div>
        <div className="account-balance-amount">
          <Odometer value={balance} decimals={2} prefix="₹" />
        </div>
        <div className="account-quick-actions">
          {quickActions.map((action) => (
            <Link key={action.iconId} href={action.href} className="account-quick-item">
              <span className={`aq-icon aq-${action.iconId}`}>
                <AccountIcon id={action.iconId === "invite-friends" ? "invite-friends" : action.iconId} size={22} className="aq-icon-img" style={{ color: "currentColor" }} />
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="account-history-grid">
        {HISTORY_ITEMS.map((item) => (
          <Link key={item.title} href={item.href} className={`account-history-card ${item.color}`}>
            <span className="ah-icon">
              <AccountIcon id={item.iconId} size={24} className="ah-icon-img" />
            </span>
            <div className="account-history-copy">
              <strong>{item.title}</strong>
              <span>{item.sub}</span>
            </div>
            <span className="ah-chevron" aria-hidden="true">
              ›
            </span>
          </Link>
        ))}
      </section>

      <section className="account-settings-list">
        {settingsItems.map((item) =>
          item.href ? (
            <Link key={item.label} href={item.href} className="account-settings-item">
              <span className="as-left">
                <span className="as-icon">
                  <AccountIcon id={item.iconId} size={22} className="as-icon-img" />
                </span>
                {item.label}
              </span>
              <span className="as-right">
                {item.showUnread && unreadCount > 0 ? (
                  <span className="account-unread-badge">{unreadCount}</span>
                ) : null}
                <span className="as-chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              className="account-settings-item account-settings-button"
              onClick={() => handleSettingsAction(item)}
            >
              <span className="as-left">
                <span className="as-icon">
                  <AccountIcon id={item.iconId} size={22} className="as-icon-img" />
                </span>
                {item.label}
              </span>
              <span className="as-right">
                <span className="as-chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </button>
          )
        )}
      </section>


      {toast && <div className="account-toast">{toast}</div>}

      <AccountSheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        maintenanceMessage={maintenanceMode ? maintenanceMessage : ""}
      />

      <AnnouncementsModal
        open={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        items={announcementItems}
        marquee={announcementMarquee}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={maintenanceMessage}
      />

      <button type="button" className="account-logout" onClick={handleLogout}>
        <AccountIcon id="logout" size={18} className="account-logout-icon" />
        Logout
      </button>

      <BottomNav />
    </main>
  );
}

function renderAvatarSvg(id, size = 44) {
  switch (id) {
    case "1":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#FFE082"/>
          <circle cx="50" cy="40" r="22" fill="#4E342E"/>
          <path d="M20 90a30 30 0 0 1 60 0" fill="#5D4037"/>
          <rect x="35" y="35" width="30" height="8" rx="2" fill="#000"/>
          <circle cx="50" cy="45" r="3" fill="#FF8F00"/>
        </svg>
      );
    case "2":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#80CBC4"/>
          <circle cx="50" cy="38" r="20" fill="#D7CCC8"/>
          <path d="M25 90a25 25 0 0 1 50 0" fill="#00796B"/>
          <path d="M40 30c5-5 15-5 20 0" stroke="#37474F" strokeWidth="4" fill="none"/>
        </svg>
      );
    case "3":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#CE93D8"/>
          <circle cx="50" cy="42" r="22" fill="#FFE082"/>
          <path d="M22 88a28 28 0 0 1 56 0" fill="#7B1FA2"/>
          <circle cx="42" cy="42" r="2" fill="#333"/>
          <circle cx="58" cy="42" r="2" fill="#333"/>
          <path d="M45 50q5 4 10 0" stroke="#333" strokeWidth="2" fill="none"/>
        </svg>
      );
    case "4":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#FFCC80"/>
          <rect x="30" y="20" width="40" height="25" rx="10" fill="#E65100"/>
          <circle cx="50" cy="45" r="20" fill="#FFD54F"/>
          <path d="M24 92a26 26 0 0 1 52 0" fill="#BF360C"/>
        </svg>
      );
    case "5":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#90CAF9"/>
          <rect x="32" y="24" width="36" height="30" rx="6" fill="#37474F"/>
          <circle cx="42" cy="38" r="4" fill="#00E676"/>
          <circle cx="58" cy="38" r="4" fill="#00E676"/>
          <rect x="42" y="46" width="16" height="4" fill="#00E676"/>
          <path d="M25 90a25 25 0 0 1 50 0" fill="#1565C0"/>
        </svg>
      );
    case "6":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#F48FB1"/>
          <path d="M30 25c10-10 30-10 40 0 10 10 5 30 5 30H25s-5-20 5-30z" fill="#AD1457"/>
          <circle cx="50" cy="44" r="18" fill="#FFD54F"/>
          <path d="M26 88a24 24 0 0 1 48 0" fill="#C2185B"/>
        </svg>
      );
    case "7":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#A5D6A7"/>
          <circle cx="50" cy="36" r="18" fill="#F5CBA7"/>
          <path d="M36 44c0 10 8 16 14 16s14-6 14-16" fill="#5D4037"/>
          <path d="M26 90a24 24 0 0 1 48 0" fill="#2E7D32"/>
        </svg>
      );
    case "8":
      return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="50" fill="#B0BEC5"/>
          <circle cx="50" cy="44" r="20" fill="#FFE082"/>
          <path d="M35 24l5 8 10-8 10 8 5-8v12H35V24z" fill="#FFD54F"/>
          <path d="M24 90a26 26 0 0 1 52 0" fill="#37474F"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "rgba(255,255,255,0.4)" }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}
