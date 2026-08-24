"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getDepositOptions, getWalletRules, getDepositPayment } from "@/lib/platformApi";
import { mergeWalletRules } from "@/lib/withdrawRules";
import { getBalance } from "@/lib/walletApi";
import { parseWalletBalance } from "@/lib/walletBalance";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getSocket } from "@/lib/socket";
import DepositIcon from "@/components/wallet/DepositIcon";
import { Odometer } from "@/components/Odometer";
import PageLoader from "@/components/brand/PageLoader";
import {
  CRYPTO_RECHARGE_INSTRUCTIONS,
  USDT_PRESET_AMOUNTS,
  convertUsdtToInr,
  formatUsdtAmount,
  isCryptoChannel } from "@/lib/depositCrypto";

const PRESET_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];

const RECHARGE_INSTRUCTIONS = [
  "Upload a clear payment screenshot on the pay page before submitting — it is mandatory.",
  "If the transfer time is up, please fill out the deposit form again.",
  "The transfer amount must match the order you created, otherwise the money cannot be credited successfully.",
  "If you transfer the wrong amount, our company will not be responsible for the lost amount!",
  "Note: do not cancel the deposit order after the money has been transferred.",
];

const DEFAULT_DISABLED_MESSAGE =
  "No deposit channels are available right now. Please try again later or contact support.";

const formatPreset = (value, currencyUnit = "INR") => {
  if (currencyUnit === "USDT") {
    return value >= 1000 ? `${value / 1000}K` : `${value}`;
  }
  return value >= 1000 ? `₹${value / 1000}K` : `₹${value}`;
};

const renderBonusText = (b) => {
  if (!b) return null;
  const s = String(b).trim();
  const lower = s.toLowerCase();
  if (lower === "" || lower === "0" || lower === "0%" || lower === "0.0" || lower === "0.00" || lower === "0.00%") {
    return null;
  }
  const prefix = s.startsWith("+") ? "" : "+";
  return <em className="deposit-channel-bonus">{prefix}{s}</em>;
};

export default function DepositPage() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState("paytm");
  const [channel, setChannel] = useState("weepay");
  const [amount, setAmount] = useState("");
  const [inrAmount, setInrAmount] = useState("");
  const [error, setError] = useState("");
  const [goToLoading, setGoToLoading] = useState(false);
  const [depositOptions, setDepositOptions] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [platformDepositRules, setPlatformDepositRules] = useState({ minAmount: 1, maxAmount: 50000 });

  const allMethods = depositOptions?.methods || [];
  const allChannels = depositOptions?.channels || [];
  const activeMethods = allMethods.filter((item) => item.enabled);
  const activeChannels = allChannels.filter((item) => item.enabled);
  const hasChannels = activeChannels.length > 0;
  const channelDisabledMessage = depositOptions?.disabledMessage || DEFAULT_DISABLED_MESSAGE;
  const selectedChannelRaw =
    activeChannels.find((item) => item.id === channel) ||
    activeChannels[0] ||
    ({ id: "", label: "—", min: 1, max: 1, bonus: "", range: "", type: "upi", usdtRate: 102 });
  const isCryptoRaw = selectedChannelRaw.type === "crypto";
  const selectedChannel = {
    ...selectedChannelRaw,
    min: isCryptoRaw ? Number(selectedChannelRaw.min || 10) : Math.max(Number(selectedChannelRaw.min || 1), platformDepositRules.minAmount),
    max: isCryptoRaw ? Number(selectedChannelRaw.max || 100000) : Math.min(Number(selectedChannelRaw.max || platformDepositRules.maxAmount), platformDepositRules.maxAmount) };
  const selectedMethod =
    activeMethods.find((item) => item.id === method) ||
    activeMethods[0] ||
    ({ id: "", label: "—" });
  const methodLinkedChannel = selectedMethod?.channelId
    ? allChannels.find((item) => item.id === selectedMethod.channelId)
    : null;
  const activeChannelType = methodLinkedChannel?.type || selectedChannel?.type || "upi";
  const displayChannels = selectedMethod?.channelId
    ? allChannels.filter((item) => item.id === selectedMethod.channelId)
    : allChannels.length > 0
      ? allChannels.filter((item) => (item.type || "upi") === activeChannelType)
      : allChannels;
  const parsedAmount = Number(amount);
  const parsedInrAmount = Number(inrAmount);
  const isCrypto = isCryptoChannel(selectedChannel);
  const usdtRate = selectedChannel.usdtRate || 102;
  const inrEquivalent = isCrypto ? convertUsdtToInr(parsedAmount, usdtRate) : parsedAmount;
  const isDepositMaintenance = depositOptions?.maintenance === true;
  const depositMaintenanceMsg = depositOptions?.maintenanceMessage || "Deposit channels are currently in maintenance. Please try again later.";

  const canContinue =
    hasChannels &&
    parsedAmount >= selectedChannel.min &&
    parsedAmount <= selectedChannel.max &&
    (!isCrypto || inrEquivalent > 0) &&
    !maintenanceMode &&
    !blocksAction("deposit") &&
    !isDepositMaintenance;

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await getBalance();
      const { available } = parseWalletBalance(res);
      setBalance(available);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      if (getToken()) {
        loadBalance();
      }
    }, 0);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([getDepositOptions(), getWalletRules()])
      .then(([optionsRes, rulesRes]) => {
        const options = optionsRes?.data || null;
        setDepositOptions(options);
        setPlatformDepositRules(mergeWalletRules(rulesRes?.data).deposit);
        const firstMethod = options?.methods?.find((item) => item.enabled);
        const firstChannel = options?.channels?.find((item) => item.enabled);
        if (firstMethod) setMethod(firstMethod.id);
        if (firstChannel) setChannel(firstChannel.id);
      })
      .catch(() => {
        setDepositOptions({
          disabledMessage: DEFAULT_DISABLED_MESSAGE,
          methods: [],
          channels: [] });
      })
      .finally(() => setOptionsLoading(false));

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
  }, [router, loadBalance]);

  const selectMethod = (methodItem) => {
    setMethod(methodItem.id);
    if (methodItem.channelId) {
      const linked = allChannels.find((item) => item.id === methodItem.channelId);
      if (linked) setChannel(methodItem.channelId);
    }
    setAmount("");
    setInrAmount("");
  };

  const selectChannel = (channelId) => {
    setChannel(channelId);
    setAmount("");
    setInrAmount("");
  };

  const handleUsdtAmountChange = (value) => {
    setAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setInrAmount(String(convertUsdtToInr(parsed, usdtRate)));
    } else {
      setInrAmount("");
    }
  };

  const handleInrAmountChange = (value) => {
    setInrAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0 && usdtRate > 0) {
      setAmount(String(Math.round((parsed / usdtRate) * 100) / 100));
    } else {
      setAmount("");
    }
  };

  const goToPayment = async () => {
    if (!canContinue) {
      const unit = isCrypto ? "USDT" : "₹";
      setError(
        hasChannels
          ? `Enter amount between ${unit}${selectedChannel.min.toLocaleString("en-IN")} and ${unit}${selectedChannel.max.toLocaleString("en-IN")}`
          : channelDisabledMessage
      );
      return;
    }
    if (blocksAction("deposit")) {
      setError(maintenanceMessage || "Deposits are temporarily unavailable.");
      return;
    }
    setError("");
    setGoToLoading(true);

    try {
      const paymentRes = await getDepositPayment(channel, parsedAmount);
      const paymentData = paymentRes?.data || null;

      if (!paymentData) {
        throw new Error("Failed to initialize payment details");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("deposit_amount", String(parsedAmount));
        sessionStorage.setItem("deposit_method", method);
        sessionStorage.setItem("deposit_channel", channel);
        sessionStorage.setItem("deposit_payment_details", JSON.stringify(paymentData));
        if (isCrypto) {
          sessionStorage.setItem("deposit_inr", String(inrEquivalent));
        } else {
          sessionStorage.removeItem("deposit_inr");
        }
      }



      router.push(`/wallet/deposit/pay`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to initialize payment details.");
    } finally {
      setGoToLoading(false);
    }
  };

  const visiblePresets = isCrypto
    ? USDT_PRESET_AMOUNTS
    : PRESET_AMOUNTS.filter((preset) => preset >= selectedChannel.min && preset <= selectedChannel.max);

  const isBep20 = selectedChannel?.label?.includes("BEP20") || selectedChannel?.id?.includes("bep20");
  const networkName = isBep20 ? "BEP20" : "TRC20";
  const minText = isBep20 ? "1 USDT" : "12 USDT";
  const instructionList = isCrypto
    ? CRYPTO_RECHARGE_INSTRUCTIONS.map((item) =>
        item
          .replace("10 USDT", minText)
          .replace("TRC20", networkName)
      )
    : RECHARGE_INSTRUCTIONS;

  const formatBalanceText = (min, max, type) => {
    const formatVal = (val) => {
      if (val >= 1000) {
        const kVal = val / 1000;
        return `${Number(kVal.toFixed(1))}K`;
      }
      return `${val}`;
    };
    if (type === "crypto") {
      return `Balance: ${min} - ${max} USDT`;
    }
    return `Balance:${formatVal(min)} - ${formatVal(max)}`;
  };

  const renderPaymentLogo = (id) => {
    if (!id) return null;
    const key = String(id).toLowerCase();
    
    if (id.startsWith("http://") || id.startsWith("https://") || id.startsWith("/") || id.includes(".") || id.includes("/")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={id}
          alt=""
          width={32}
          height={32}
          className="deposit-method-logo-img"
          style={{ width: "32px", height: "32px", objectFit: "contain", marginBottom: "2px" }}
        />
      );
    }

    if (key.includes("usdt") || key.includes("crypto") || key.includes("tron") || key.includes("tether")) {
      return (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
          <circle cx="12" cy="12" r="10" fill="#26A17B" />
          <path d="M7 8h10M12 8v8M9 11h6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }
    if (key.includes("phonepe")) {
      return (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
          <rect width="24" height="24" rx="5" fill="#5F259F" />
          <path d="M12 4c-3.2 0-6 1.8-6 5.5s2.8 5.5 6 5.5h1.2v3.5h2.2v-3.5H12c-1.8 0-3.5-.8-3.5-3s1.8-3 3.5-3h3.5V4H12Z" fill="#fff" />
        </svg>
      );
    }
    if (key.includes("gpay") || key.includes("google")) {
      return (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
          <rect width="24" height="24" rx="5" fill="#fff" stroke="#f1f3f4" strokeWidth="1" />
          <path d="M17 12a5 5 0 0 1-5 5v-10a5 5 0 0 1 5 5Z" fill="#4285F4" />
          <path d="M12 7a5 5 0 0 0-5 5h10a5 5 0 0 0-5-5Z" fill="#EA4335" />
          <path d="M7 12a5 5 0 0 1 5-5v10a5 5 0 0 1-5-5Z" fill="#FBBC05" />
          <path d="M12 17a5 5 0 0 0 5-5h-10a5 5 0 0 0 5 5Z" fill="#34A853" />
        </svg>
      );
    }
    if (key.includes("paytm")) {
      return (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
          <rect width="24" height="24" rx="5" fill="#00baf2" />
          <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="900" fontFamily="sans-serif">Paytm</text>
        </svg>
      );
    }
    if (key.includes("bharatpe")) {
      return (
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
          <rect width="24" height="24" rx="5" fill="#000" />
          <text x="12" y="11" textAnchor="middle" fill="#00D2C4" fontSize="5" fontWeight="bold">Bharat</text>
          <text x="12" y="17" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">Pe</text>
        </svg>
      );
    }
    // Default: UPI QR Logo
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" style={{ marginBottom: "2px" }}>
        <rect width="24" height="24" rx="5" fill="#097969" />
        <path d="M5 8h4v2H7v4h2v2H5V8Z" fill="#fff" />
        <path d="M11 8h2.5c1 0 1.5.5 1.5 1.5s-.5 1.5-1.5 1.5H12.5v4H11V8Zm1.5 2h1c.3 0 .5-.1.5-.5s-.2-.5-.5-.5h-1v1Z" fill="#fff" />
        <path d="M17 8h2v8h-2V8Z" fill="#fff" />
      </svg>
    );
  };

  if (!mounted || optionsLoading) {
    return <PageLoader />;
  }

  return (
    <main className="deposit-page">
      <header className="deposit-header center-title">
        <Link href="/wallet" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Deposit</h1>
        <Link href="/wallet/deposit/history" className="deposit-history-link">
          Deposit history
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="wallet-maintenance-notice">
          {maintenanceMessage || "Deposits are temporarily unavailable during maintenance."}
        </div>
      ) : null}

      <section className="deposit-balance-card">
        <div className="deposit-balance-card-top">
          <div className="deposit-balance-card-label">
            <DepositIcon id="wallet-pill" size={18} className="deposit-balance-card-icon" />
            <span>Balance</span>
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
          {balanceLoading ? "..." : <Odometer value={balance} decimals={2} prefix="₹" />}
        </p>
        <span className="deposit-balance-mask">**** ****</span>
      </section>
      {isDepositMaintenance ? (
        <section className="deposit-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", minHeight: "300px" }}>
          <div style={{ borderRadius: "50%", padding: "20px", marginBottom: "20px" }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ color: "var(--theme-gold, #D4AF37)" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--theme-text)", marginBottom: "12px" }}>In Maintenance</h2>
          <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.6", maxWidth: "290px", margin: "0 auto" }}>
            {depositMaintenanceMsg}
          </p>
        </section>
      ) : (
        <>
          <section className="deposit-section">
            {allMethods.length > 0 ? (
              <div className="deposit-methods-grid">
                {allMethods.map((item) =>
                  item.enabled ? (
                    <button
                      key={item.id}
                      type="button"
                      className={`deposit-method-tile ${method === item.id ? "active" : ""}`}
                      onClick={() => selectMethod(item)}
                    >
                      {item.badge && item.badge !== "0" && item.badge !== 0 ? <em className="deposit-method-badge">{item.badge}</em> : null}
                      {renderPaymentLogo(
                        (item.icon && (item.icon.startsWith("http") || item.icon.startsWith("/") || item.icon.includes(".") || item.icon.toLowerCase().includes("upixqr")))
                          ? item.icon
                          : (item.id || item.icon)
                      )}
                      <strong>{item.label}</strong>
                      {item.sub && item.sub !== "0" && item.sub !== 0 ? <small>{item.sub}</small> : null}
                    </button>
                  ) : (
                    <div key={item.id} className="deposit-method-tile inactive">
                      {item.badge && item.badge !== "0" && item.badge !== 0 ? <em className="deposit-method-badge">{item.badge}</em> : null}
                      {renderPaymentLogo(
                        (item.icon && (item.icon.startsWith("http") || item.icon.startsWith("/") || item.icon.includes(".") || item.icon.toLowerCase().includes("upixqr")))
                          ? item.icon
                          : (item.id || item.icon)
                      )}
                      <strong>{item.label}</strong>
                      {item.sub && item.sub !== "0" && item.sub !== 0 ? <small>{item.sub}</small> : null}
                      <p className="deposit-item-disabled-msg">{item.disabledMessage}</p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="deposit-methods-empty">No payment methods configured.</p>
            )}
          </section>

          <section className="deposit-section">
            <div className="deposit-channel-head">
              <DepositIcon id="document" size={18} className="deposit-channel-head-icon" />
              <span>Select channel</span>
            </div>
            {displayChannels.length > 0 ? (
              <div className="deposit-channel-list">
                {displayChannels.map((item) =>
                  item.enabled ? (
                    <button
                      key={item.id}
                      type="button"
                      className={`deposit-channel-item ${channel === item.id ? "active" : ""}`}
                      onClick={() => selectChannel(item.id)}
                    >
                      <div className="deposit-channel-label-group">
                        <DepositIcon id={item.icon === "usdt" ? "usdt" : "upi-badge"} size={22} className="deposit-channel-item-icon" />
                        <strong>{item.label}</strong>
                      </div>
                      <span className="deposit-channel-meta font-medium">
                        {renderBonusText(item.bonus)}
                        {formatBalanceText(item.min, item.max, item.type)}
                      </span>
                    </button>
                  ) : (
                    <div key={item.id} className="deposit-channel-item inactive">
                      <div className="deposit-channel-label-group">
                        <DepositIcon id={item.icon === "usdt" ? "usdt" : "upi-badge"} size={22} className="deposit-channel-item-icon" />
                        <strong>{item.label}</strong>
                      </div>
                      <span className="deposit-channel-meta">
                        {item.disabledMessage || "Disabled"}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="deposit-channels-empty">
                {method ? "No channels available for selected method." : "Select a payment method first."}
              </p>
            )}
          </section>

          <section className={`deposit-section ${!hasChannels ? "deposit-section-muted" : ""}`}>
            <div className="deposit-panel">
              <div className="deposit-panel-head">
                {isCrypto ? (
                  <DepositIcon id="usdt" size={22} className="deposit-panel-head-icon" />
                ) : (
                  <span className="deposit-panel-icon">₹</span>
                )}
                <strong>{isCrypto ? "Select amount of USDT" : "Select deposit amount"}</strong>
              </div>

              <div className="deposit-amount-grid">
                {visiblePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`deposit-amount-btn ${Number(amount) === preset ? "active" : ""}`}
                    onClick={() =>
                      isCrypto ? handleUsdtAmountChange(String(preset)) : setAmount(String(preset))
                    }
                    disabled={!hasChannels}
                  >
                    {isCrypto ? (
                      <>
                        <DepositIcon id="usdt" size={18} className="deposit-amount-usdt-icon" />
                        {formatPreset(preset, "USDT")}
                      </>
                    ) : (
                      formatPreset(preset)
                    )}
                  </button>
                ))}
              </div>

              <div className={`deposit-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
                {isCrypto ? (
                  <DepositIcon id="usdt" size={18} className="deposit-custom-input-icon" />
                ) : (
                  <span>₹</span>
                )}
                <input
                  type="number"
                  placeholder={
                    isCrypto
                      ? `Please enter USDT amount (${selectedChannel.min}-${selectedChannel.max})`
                      : `${selectedChannel.min} - ${selectedChannel.max.toLocaleString("en-IN")}`
                  }
                  value={amount}
                  onChange={(e) =>
                    isCrypto ? handleUsdtAmountChange(e.target.value) : setAmount(e.target.value)
                  }
                  min={selectedChannel.min}
                  max={selectedChannel.max}
                  step={isCrypto ? "0.01" : "1"}
                  disabled={!hasChannels}
                />
                {amount ? (
                  <button
                    type="button"
                    className="deposit-clear"
                    onClick={() => {
                      setAmount("");
                      setInrAmount("");
                    }}
                    aria-label="Clear amount"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {isCrypto ? (
                <div className={`deposit-custom-input deposit-inr-convert ${parsedInrAmount > 0 ? "filled" : ""}`}>
                  <span>₹</span>
                  <input
                    type="number"
                    placeholder="Please enter the amount"
                    value={inrAmount}
                    onChange={(e) => handleInrAmountChange(e.target.value)}
                    min={1}
                    disabled={!hasChannels}
                  />
                </div>
              ) : null}

              <p className="deposit-amount-limits">
                {isCrypto ? (
                  <>
                    Min: {formatUsdtAmount(selectedChannel.min)} USDT · Max: {formatUsdtAmount(selectedChannel.max)} USDT
                    {usdtRate ? ` · Rate: ₹${usdtRate}/USDT` : null}
                  </>
                ) : (
                  <>
                    Min: ₹{selectedChannel.min.toLocaleString("en-IN")} · Max: ₹
                    {selectedChannel.max.toLocaleString("en-IN")}
                  </>
                )}
              </p>
              {isCrypto && inrEquivalent > 0 ? (
                <p className="deposit-amount-converted">
                  Wallet credit: <strong>₹{inrEquivalent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </p>
              ) : null}
            </div>
          </section>

          <section className="deposit-recharge-instructions" aria-labelledby="deposit-recharge-instructions-title">
            <div className="deposit-recharge-instructions-head">
              <span className="deposit-recharge-instructions-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 5.5V17.5a2 2 0 0 0-2 2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path d="M10 9.5h6M10 12.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <h2 id="deposit-recharge-instructions-title">Recharge instructions</h2>
            </div>
            <ul>
              {instructionList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {error ? <div className="auth-error deposit-error">{error}</div> : null}

          <div className="deposit-bottom-bar">
            <p className="deposit-bottom-method">
              {selectedMethod?.label && selectedChannel?.label ? (
                <>
                  Recharge Method: <strong>{selectedChannel.label}</strong>
                </>
              ) : (
                "Select method and channel"
              )}
            </p>
            <button
              type="button"
              className={`deposit-submit ${canContinue && !goToLoading ? "ready" : ""}`}
              disabled={!canContinue || goToLoading}
              onClick={goToPayment}
            >
              {goToLoading ? "Processing..." : "Deposit"}
            </button>
            <p className="deposit-secure-note">
              <DepositIcon id="lock" size={14} className="deposit-secure-note-icon" />
              Secure &amp; encrypted transactions
            </p>
          </div>
        </>
      )}
    </main>
  );
}
