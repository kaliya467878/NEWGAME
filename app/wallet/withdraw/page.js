"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { Odometer } from "@/components/Odometer";
import { convertUsdtToInr, formatUsdtAmount } from "@/lib/depositCrypto";
import { getBalance, getWithdrawContext, requestWithdraw } from "@/lib/walletApi";
import { parseWalletBalance } from "@/lib/walletBalance";
import {
  buildAccountDetailsForWithdraw,
  emptyWithdrawAccountsState,
  fetchWithdrawAccountsState,
  selectWithdrawAccount,
  setWithdrawMethod } from "@/lib/withdrawAccounts";
import {
  buildWithdrawRules,
  getWithdrawLimitsForMethod,
  mergeWalletRules,
  maskAccountNumber } from "@/lib/withdrawRules";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getSocket } from "@/lib/socket";
import DepositIcon from "@/components/wallet/DepositIcon";
import PageLoader from "@/components/brand/PageLoader";
import { getWithdrawAccountLine } from "@/lib/withdrawHistory";

const WITHDRAW_METHODS = [
  { id: "bank", label: "BANK CARD", icon: "bank" },
  { id: "usdt", label: "USDT", icon: "usdt" },
];

const ACCOUNTS_PATH = "/wallet/withdraw/accounts";

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 });

const maskUsdtAddress = (value = "") => {
  const trimmed = String(value).trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
};

export default function WithdrawPage() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [accountsReady, setAccountsReady] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [requiredWager, setRequiredWager] = useState(0);
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [, setAccountsState] = useState(emptyWithdrawAccountsState());
  const [accounts, setAccounts] = useState({ bank: [], upi: [], usdt: [] });
  const [selectedIds, setSelectedIds] = useState({ bank: null, upi: null, usdt: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [walletRules, setWalletRules] = useState(null);
  const [withdrawStats, setWithdrawStats] = useState(null);

  const visibleMethods = useMemo(() => {
    return WITHDRAW_METHODS.filter((item) => {
      const methodLimits = getWithdrawLimitsForMethod(walletRules, item.id);
      return methodLimits && methodLimits.enabled !== false;
    });
  }, [walletRules]);

  const limits = getWithdrawLimitsForMethod(walletRules, method);
  const usdtRate = limits.usdtRate || 104;
  const parsedAmount = Number(amount);
  const parsedUsdtAmount = Number(usdtAmount);
  const maxAllowed = Math.min(availableBalance, limits.max);

  useEffect(() => {
    if (visibleMethods.length > 0 && !visibleMethods.some((m) => m.id === method)) {
      setMethod(visibleMethods[0].id);
    }
  }, [visibleMethods, method]);

  const methodAccounts = useMemo(() => accounts[method] || [], [accounts, method]);
  const selectedAccount = useMemo(() => {
    const selectedId = selectedIds[method];
    return methodAccounts.find((item) => item.id === selectedId) || methodAccounts[0] || null;
  }, [methodAccounts, selectedIds, method]);

  const hasValidAccount = Boolean(selectedAccount);

  const withdrawInrAmount =
    method === "usdt"
      ? parsedAmount > 0
        ? parsedAmount
        : convertUsdtToInr(parsedUsdtAmount, usdtRate)
      : parsedAmount;

  const hasValidAmount =
    withdrawInrAmount >= limits.min &&
    withdrawInrAmount <= maxAllowed &&
    withdrawInrAmount <= limits.max;

  const receivedDisplay =
    method === "usdt" && parsedUsdtAmount > 0
      ? `${formatUsdtAmount(parsedUsdtAmount)} USDT`
      : `₹${hasValidAmount ? formatInr(withdrawInrAmount) : "0.00"}`;

  const canSubmit =
    hasValidAmount &&
    hasValidAccount &&
    limits.enabled !== false &&
    !loading &&
    !maintenanceMode &&
    !blocksAction("withdraw") &&
    withdrawStats?.hasApprovedDeposit !== false &&
    requiredWager <= 0 &&
    !withdrawStats?.holdWithdrawals;

  const rules = useMemo(
    () => buildWithdrawRules({ method, limits, walletRules, stats: withdrawStats, requiredWager }),
    [method, limits, walletRules, withdrawStats, requiredWager]
  );

  const applyAccountsState = useCallback((state) => {
    setAccountsState(state);
    setAccounts({
      bank: state.bank || [],
      upi: state.upi || [],
      usdt: state.usdt || [] });
    setSelectedIds(state.selected || { bank: null, upi: null, usdt: null });
    return state;
  }, []);

  const refreshAccounts = useCallback(async () => {
    const state = await fetchWithdrawAccountsState();
    return applyAccountsState(state);
  }, [applyAccountsState]);

  const redirectToAddAccount = useCallback(
    (nextMethod) => {
      router.replace(`${ACCOUNTS_PATH}?method=${nextMethod}&return=/wallet/withdraw`);
    },
    [router]
  );



  const loadWithdrawContext = useCallback(async () => {
    try {
      const res = await getWithdrawContext();
      setWalletRules(mergeWalletRules(res.data?.rules));
      const stats = res.data?.stats || null;
      setWithdrawStats(stats);
      // Sync wager remaining from context if available
      if (stats?.wagerRemaining !== undefined) {
        setRequiredWager(stats.wagerRemaining);
      }
    } catch {
      setWalletRules(mergeWalletRules(null));
      setWithdrawStats(null);
    }
  }, []);


  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await getBalance();
      const { locked, available } = parseWalletBalance(res);
      setLockedBalance(locked);
      setAvailableBalance(available);
      setRequiredWager(res?.data?.requiredWager || 0);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load wallet balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let activeSocket = null;
    let cancelled = false;

    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") {
        setAvailableBalance(data.balance);
      }
    };

    const init = async () => {
      try {
        const state = await refreshAccounts();
        const initialMethod = state.method === "upi" ? "bank" : (state.method || "bank");
        setMethod(initialMethod);

        setAccountsReady(true);
        loadBalance();
        loadWithdrawContext();

        const socket = await getSocket();
        if (!socket || cancelled) return;
        activeSocket = socket;
        socket.emit("join:user");
        socket.on("wallet:updated", onWalletUpdated);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err.response?.data?.message || "Failed to load withdraw accounts");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [router, loadBalance, refreshAccounts, redirectToAddAccount, loadWithdrawContext]);

  useEffect(() => {
    const onFocus = () => {
      refreshAccounts().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshAccounts]);

  const selectMethod = async (nextMethod) => {
    setMethod(nextMethod);
    setAmount("");
    setUsdtAmount("");
    setError("");

    try {
      await setWithdrawMethod(nextMethod);
      await refreshAccounts();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update method");
    }
  };

  const chooseAccount = async (accountId) => {
    try {
      await selectWithdrawAccount(method, accountId);
      await refreshAccounts();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to select account");
    }
  };

  const fillAllAmount = () => {
    const value = Math.min(availableBalance, limits.max);
    if (value <= 0) return;
    if (method === "usdt") {
      setAmount(String(Math.round(value * 100) / 100));
      setUsdtAmount(String(Math.round((value / usdtRate) * 100) / 100));
    } else {
      setAmount(String(Math.round(value * 100) / 100));
    }
  };

  const handleInrAmountChange = (value) => {
    setAmount(value);
    if (method !== "usdt") return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setUsdtAmount(String(Math.round((parsed / usdtRate) * 100) / 100));
    } else {
      setUsdtAmount("");
    }
  };

  const handleUsdtAmountChange = (value) => {
    setUsdtAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmount(String(convertUsdtToInr(parsed, usdtRate)));
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedAccount) return;
    if (blocksAction("withdraw")) {
      setError(maintenanceMessage || "Withdrawals are temporarily unavailable.");
      return;
    }

    setLoading(true);
    setError("");

    const accountDetails = buildAccountDetailsForWithdraw(method, selectedAccount);
    if (method === "usdt") {
      accountDetails.usdtAmount = parsedUsdtAmount || undefined;
    }

    const methodLabel = method === "upi" ? "UPI" : method === "bank" ? "Bank" : "USDT";

    try {
      const res = await requestWithdraw({
        amount: withdrawInrAmount,
        method: methodLabel,
        accountDetails });

      setSuccess({
        amount: withdrawInrAmount,
        method: methodLabel,
        usdtAmount: method === "usdt" ? parsedUsdtAmount : null,
        accountLine: getWithdrawAccountLine({
          method: methodLabel,
          accountDetails: accountDetails }),
        id: res.data?.id || res.data?._id || res.id });
      setShowSuccessModal(true);
      setAmount("");
      setUsdtAmount("");
      loadWithdrawContext();
      loadBalance();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <PageLoader />;
  }

  if (!accountsReady) {
    return <PageLoader />;
  }

  return (
    <main className="withdraw-page">
      <header className="withdraw-header has-history-link">
        <Link href="/wallet" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Withdraw</h1>
        <Link href="/wallet/withdraw/history" className="withdraw-history-link">
          History
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="wallet-maintenance-notice">
          {maintenanceMessage || "Withdrawals are temporarily unavailable during maintenance."}
        </div>
      ) : null}

      <section className="deposit-balance-card withdraw-balance-card">
        <div className="deposit-balance-card-top">
          <div className="deposit-balance-card-label">
            <DepositIcon id="wallet-pill" size={18} className="deposit-balance-card-icon" />
            <span>Available balance</span>
          </div>
          <button
            type="button"
            className="deposit-balance-refresh"
            onClick={loadBalance}
            disabled={balanceLoading}
            aria-label="Refresh balance"
          >
            ↻
          </button>
        </div>
        <p className="deposit-balance-amount">
          {balanceLoading ? "..." : <Odometer value={availableBalance} decimals={2} prefix="₹" />}
        </p>
        <span className="deposit-balance-mask">**** ****</span>
      </section>

      {withdrawStats?.hasApprovedDeposit === false ? (
        <div style={{
          margin: "12px 16px 0",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "rgb(248, 113, 113)",
          fontSize: "11px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <span style={{ fontWeight: "bold", color: "rgb(252, 165, 165)" }}>⚠️ Action Required:</span>
          <span>You must complete at least one recharge (deposit) to be eligible for withdrawals.</span>
        </div>
      ) : null}

      {requiredWager > 0 ? (
        <div style={{
          margin: "12px 16px 0",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(249, 115, 22, 0.2)",
          color: "rgb(251, 146, 60)",
          fontSize: "11px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <span style={{ fontWeight: "bold", color: "rgb(253, 186, 116)" }}>⚠️ Remaining Wager Requirement:</span>
          <span>You must place ₹{requiredWager.toLocaleString("en-IN")} more in wagers (bets) before you can request a withdrawal.</span>
        </div>
      ) : null}

      <section className="withdraw-section">
        <div className="withdraw-method-tabs">
          {visibleMethods.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`withdraw-method-tab ${method === item.id ? "active" : ""}`}
              onClick={() => selectMethod(item.id)}
            >
              {item.icon === "usdt" ? (
                <DepositIcon id="usdt" size={22} className="withdraw-method-tab-icon" />
              ) : item.icon === "upi" ? (
                <DepositIcon id="upi-badge" size={22} className="withdraw-method-tab-icon" />
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" className="withdraw-method-tab-icon" style={{ opacity: 0.8 }}>
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              )}
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="withdraw-section">
        <div className="withdraw-account-select-head">
          <p className="withdraw-step-label">Select account</p>
          <Link
            href={`${ACCOUNTS_PATH}?method=${method}&return=/wallet/withdraw`}
            className="withdraw-manage-accounts-link"
          >
            Manage
          </Link>
        </div>

        <div className="withdraw-accounts-list">
          {methodAccounts.map((item) => {
            const isSelected = selectedAccount?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`withdraw-linked-account withdraw-account-select ${isSelected ? "selected" : ""}`}
                onClick={() => chooseAccount(item.id)}
              >
                {method === "bank" ? (
                  <>
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" className="withdraw-linked-account-icon-img" style={{ color: "var(--gold)", opacity: 0.9 }}>
                      <path d="M3 21h18M3 10h18M5 10v11M19 10v11M12 10v11M4 6l8-4 8 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="withdraw-linked-account-copy">
                      <strong>{item.accountName}</strong>
                      <small>{maskAccountNumber(item.accountNumber)}</small>
                    </div>
                  </>
                ) : null}
                {method === "upi" ? (
                  <>
                    <DepositIcon id="upi-badge" size={26} className="withdraw-linked-account-icon-img" />
                    <div className="withdraw-linked-account-copy">
                      <strong>UPI account</strong>
                      <small>{item.upiId}</small>
                    </div>
                  </>
                ) : null}
                {method === "usdt" ? (
                  <>
                    <DepositIcon id="usdt" size={22} className="withdraw-linked-account-icon-img" />
                    <div className="withdraw-linked-account-copy">
                      <strong>USDT TRC20</strong>
                      <small>{maskUsdtAddress(item.address)}</small>
                    </div>
                  </>
                ) : null}
                <span className={`withdraw-account-radio ${isSelected ? "checked" : ""}`} aria-hidden />
              </button>
            );
          })}
        </div>

        <Link
          href={`${ACCOUNTS_PATH}?method=${method}&return=/wallet/withdraw`}
          className="withdraw-add-account withdraw-add-account-link"
        >
          <span>+</span>
          <strong>Add new account</strong>
        </Link>
      </section>

      <section className="withdraw-section">
        <div className="withdraw-panel">
          <div className="withdraw-panel-head">
            {method === "usdt" ? (
              <DepositIcon id="usdt" size={18} className="withdraw-panel-head-icon" />
            ) : (
              <span className="withdraw-panel-icon">₹</span>
            )}
            <strong>{method === "usdt" ? "Select amount of USDT" : "Enter withdrawal amount"}</strong>
          </div>

          {method === "usdt" ? (
            <>
              <div className={`withdraw-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
                <span>₹</span>
                <input
                  type="number"
                  placeholder="Please enter withdrawal amount"
                  value={amount}
                  onChange={(e) => handleInrAmountChange(e.target.value)}
                  min={limits.min}
                  max={maxAllowed}
                />
              </div>
              <div className={`withdraw-custom-input withdraw-usdt-input ${parsedUsdtAmount > 0 ? "filled" : ""}`}>
                <DepositIcon id="usdt" size={16} className="withdraw-custom-input-icon" />
                <input
                  type="number"
                  placeholder="Please enter USDT amount"
                  value={usdtAmount}
                  onChange={(e) => handleUsdtAmountChange(e.target.value)}
                  min={limits.min / usdtRate}
                  step="0.01"
                />
              </div>
            </>
          ) : (
            <div className={`withdraw-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
              <span>₹</span>
              <input
                type="number"
                placeholder="Please enter the amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={limits.min}
                max={maxAllowed}
              />
              {amount ? (
                <button type="button" className="withdraw-clear" onClick={() => setAmount("")} aria-label="Clear">
                  ✕
                </button>
              ) : null}
            </div>
          )}

          <div className="withdraw-amount-meta">
            <p>
              Withdrawable balance{" "}
              <strong>₹{formatInr(availableBalance)}</strong>
              {lockedBalance > 0 ? (
                <span className="withdraw-locked-note"> · Locked ₹{formatInr(lockedBalance)}</span>
              ) : null}
            </p>
            <button type="button" className="withdraw-all-btn" onClick={fillAllAmount}>
              All
            </button>
          </div>

          <div className="withdraw-received-row">
            <span>Withdrawal amount received</span>
            <strong>{receivedDisplay}</strong>
          </div>
        </div>
      </section>



      <section className="deposit-recharge-instructions withdraw-rules-card" aria-labelledby="withdraw-rules-title">
        <div className="deposit-recharge-instructions-head">
          <span className="deposit-recharge-instructions-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 5.5h11a2 2 0 0 1 2 2v11.5H8a2 2 0 0 1-2-2V5.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M8 5.5V17.5a2 2 0 0 0-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M10 9.5h6M10 12.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <h2 id="withdraw-rules-title">Withdrawal instructions</h2>
        </div>
        <ul>
          {rules.map((rule) => (
            <li key={rule.text || rule.parts?.map((part) => part.text + (part.highlight || "")).join("")}>
              {rule.parts ? (
                rule.parts.map((part, index) =>
                  part.highlight ? (
                    <span key={`${part.highlight}-${index}`} className="withdraw-rule-highlight">
                      {part.highlight}
                    </span>
                  ) : (
                    <span key={`${part.text}-${index}`}>{part.text}</span>
                  )
                )
              ) : (
                rule.text
              )}
            </li>
          ))}
        </ul>
      </section>

      {error ? <div className="auth-error withdraw-error">{error}</div> : null}

      <div className="withdraw-bottom-bar">
        <p className="withdraw-bottom-method">
          Withdraw method:{" "}
          <strong>
            {method === "bank" ? "Bank card" : method === "upi" ? "UPI" : "USDT - TRC20"}
          </strong>
        </p>
        <button
          type="button"
          className={`withdraw-submit ${canSubmit ? "ready" : ""}`}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
        <p className="withdraw-secure-note">
          <DepositIcon id="lock" size={14} className="withdraw-secure-note-icon" />
          Secure &amp; encrypted transactions
        </p>
      </div>

      {showSuccessModal && success && (
        <div className="withdraw-modal-overlay" onClick={() => {
          setShowSuccessModal(false);
          setSuccess(null);
        }}>
          <div className="withdraw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="withdraw-modal-banner">
              Withdrawal is processing
            </div>
            <div className="withdraw-modal-body">
              <div className="withdraw-modal-success-icon">✓</div>
              <h3>Withdrawal is processing</h3>
              <p>
                Your withdrawal request has been submitted for review.
              </p>
              <div className="withdraw-modal-fee-table">
                <div className="withdraw-modal-fee-row">
                  <span>Requested Amount:</span>
                  <span>₹{formatInr(success.amount)}</span>
                </div>
                <div className="withdraw-modal-fee-row" style={{ color: "#f87171" }}>
                  <span>Fee / Tax (5%):</span>
                  <span>-₹{formatInr(success.amount * 0.05)}</span>
                </div>
                <div className="withdraw-modal-fee-row net-row">
                  <span>Net Payout Amount:</span>
                  <span>₹{formatInr(success.amount * 0.95)}</span>
                </div>
              </div>
            </div>
            <div className="withdraw-modal-footer">
              <button
                type="button"
                className="withdraw-modal-btn primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                  router.push("/wallet/withdraw/history");
                }}
              >
                View History
              </button>
              <button
                type="button"
                className="withdraw-modal-btn secondary"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                  router.push("/wallet");
                }}
              >
                Back to Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && error && (
        <div className="withdraw-modal-overlay" onClick={() => {
          setShowErrorModal(false);
          setError("");
        }}>
          <div className="withdraw-modal-card error-card" onClick={(e) => e.stopPropagation()} style={{ borderTop: "4px solid #ef4444" }}>
            <div className="withdraw-modal-banner" >
              Withdrawal Failed
            </div>
            <div className="withdraw-modal-body" style={{ padding: "30px 20px" }}>
              <div className="withdraw-modal-success-icon" style={{ color: "white" }}>⚠️</div>
              <h3 style={{ color: "#ef4444", marginTop: "15px", fontWeight: "bold" }}>Transaction Denied</h3>
              <p style={{ marginTop: "10px", fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6" }}>
                {error}
              </p>
            </div>
            <div className="withdraw-modal-footer">
              <button
                type="button"
                className="withdraw-modal-btn primary"
                style={{ color: "white", border: "none" }}
                onClick={() => {
                  setShowErrorModal(false);
                  setError("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
