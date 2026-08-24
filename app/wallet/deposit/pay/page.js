"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getToken } from "@/lib/auth";
import { buildUpiPaymentUri, openPaymentApp } from "@/lib/depositPayment";
import { getDepositPayment, getDepositOptions } from "@/lib/platformApi";
import DepositProofUploadField from "@/components/wallet/DepositProofUploadField";
import { requestDeposit } from "@/lib/walletApi";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import DepositCryptoPayScreen from "./DepositCryptoPayScreen";
import "./deposit-pay.css";

const ORDER_TIMEOUT_SEC = 15 * 60;

const PAY_APP_OPTIONS = [
  {
    id: "paytm",
    label: "Paytm",
    theme: "blue",
    logo: "/design/deposit/paytm-logo.svg" },
  {
    id: "phonepe",
    label: "PhonePe",
    theme: "purple",
    logo: "/design/deposit/phonepe-logo.svg" },
];

const QR_STEPS = [
  "Please use another device to scan the QR code with your payment app",
  "If you scan the QR code from this device's gallery, the payment amount may be limited (≤2000).",
];

const formatTimer = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const formatAmount = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 });

function DepositPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const searchAmount = searchParams.get("amount");
  const searchInr = searchParams.get("inr");
  const searchMethod = searchParams.get("method");
  const searchChannel = searchParams.get("channel");

  const [amountParam, setAmountParam] = useState(0);
  const [inrParam, setInrParam] = useState(0);
  const [methodIdParam, setMethodIdParam] = useState("");
  const [channelId, setChannelId] = useState("");
  const [paramsLoaded, setParamsLoaded] = useState(false);

  const [activeMethodId, setActiveMethodId] = useState("");
  const [selectedPayApp, setSelectedPayApp] = useState("paytm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [reference, setReference] = useState("");
  const [proofPath, setProofPath] = useState("");
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [payMethods, setPayMethods] = useState([]);
  const [channelLabel, setChannelLabel] = useState("");
  const [channelLimits, setChannelLimits] = useState({ min: 1, max: 100000 });
  const [remainingSec, setRemainingSec] = useState(ORDER_TIMEOUT_SEC);
  const [optionsReady, setOptionsReady] = useState(false);
  const [isCryptoFlow, setIsCryptoFlow] = useState(false);
  const [cryptoInrAmount, setCryptoInrAmount] = useState(0);

  const activeMethod = payMethods.find((item) => item.id === activeMethodId) || payMethods[0];
  const trimmedReference = reference.trim();
  const hasValidReference = trimmedReference.length >= 6;
  const amountValid =
    Number.isFinite(amountParam) &&
    amountParam >= channelLimits.min &&
    amountParam <= channelLimits.max;

  const upiUri = useMemo(() => {
    if (!paymentDetails?.upiId) return "";
    return buildUpiPaymentUri({
      upiId: paymentDetails.upiId,
      payeeName: paymentDetails.payeeName,
      amount: amountParam > 0 ? amountParam : undefined,
      note: paymentDetails.note });
  }, [paymentDetails, amountParam]);

  const hasValidProof = Boolean(proofPath);
  const canSubmit =
    amountValid &&
    hasValidReference &&
    hasValidProof &&
    activeMethod &&
    !loading &&
    !maintenanceMode &&
    !blocksAction("deposit");

  useEffect(() => {
    let amt = Number(searchAmount);
    let inrVal = Number(searchInr);
    let meth = searchMethod || "";
    let chan = searchChannel || "";

    if (typeof window !== "undefined") {
      if (!amt) amt = Number(sessionStorage.getItem("deposit_amount") || 0);
      if (!inrVal) inrVal = Number(sessionStorage.getItem("deposit_inr") || 0);
      if (!meth) meth = sessionStorage.getItem("deposit_method") || "";
      if (!chan) chan = sessionStorage.getItem("deposit_channel") || "";
    }

    setTimeout(() => {
      setAmountParam(amt);
      setInrParam(inrVal);
      setMethodIdParam(meth);
      setChannelId(chan);
      setActiveMethodId(meth);
      setParamsLoaded(true);
    }, 0);
  }, [searchAmount, searchInr, searchMethod, searchChannel]);

  useEffect(() => {
    if (!paramsLoaded) return;

    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!amountParam || !methodIdParam || !channelId) {
      router.replace("/wallet/deposit");
      return;
    }

    // Try to load pre-fetched payment details from sessionStorage to prevent secondary loading delays
    let cachedDetails = null;
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("deposit_payment_details");
        if (stored) {
          cachedDetails = JSON.parse(stored);
        }
      } catch (err) {
        console.error("Failed to parse cached payment details:", err);
      }
    }

    const runSetup = (methods, channel, paymentData) => {

      const crypto = paymentData?.type === "crypto" || paymentData?.type === "sunpays_native";
      if (crypto) {
        const resolvedInr =
          Number.isFinite(inrParam) && inrParam > 0
            ? inrParam
            : Math.round(amountParam * (paymentData?.usdtRate || channel.usdtRate || 102) * 100) /
              100;
        if (!resolvedInr && paymentData?.type !== "sunpays_native") {
          router.replace("/wallet/deposit");
          return;
        }
        setIsCryptoFlow(true);
        setCryptoInrAmount(resolvedInr || amountParam);
      }

      setPayMethods(methods);
      setActiveMethodId(methodIdParam);
      setChannelLabel(channel.label);
      setChannelLimits({ min: channel.min, max: channel.max });
      setPaymentDetails(paymentData);
      setOptionsReady(true);
    };

    // If we have cached details, bypass the slow API call
    if (cachedDetails && cachedDetails.depositId) {
      getDepositOptions()
        .then((optionsRes) => {
          const methods = (optionsRes?.data?.methods || []).filter((item) => item.enabled);
          const channels = optionsRes?.data?.channels || [];
          const channel = channels.find((item) => item.id === channelId && item.enabled);
          const method = methods.find((item) => item.id === methodIdParam);

          if (!method || !channel) {
            router.replace("/wallet/deposit");
            return;
          }

          runSetup(methods, channel, cachedDetails);
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Failed to initialize payment details.");
        });
      return;
    }

    // Fallback: fetch from API normally if no cache exists
    Promise.all([getDepositOptions(), getDepositPayment(channelId, amountParam)])
      .then(([optionsRes, paymentRes]) => {
        const methods = (optionsRes?.data?.methods || []).filter((item) => item.enabled);
        const channels = optionsRes?.data?.channels || [];
        const channel = channels.find((item) => item.id === channelId && item.enabled);
        const method = methods.find((item) => item.id === methodIdParam);

        if (!method || !channel) {
          router.replace("/wallet/deposit");
          return;
        }

        if (amountParam < channel.min || amountParam > channel.max) {
          router.replace("/wallet/deposit");
          return;
        }

        runSetup(methods, channel, paymentRes?.data || null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to initialize payment details.");
      });
  }, [paramsLoaded, amountParam, inrParam, methodIdParam, channelId, router]);

  useEffect(() => {
    if (!optionsReady) return undefined;
    const timer = setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [optionsReady]);

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(amountParam));
    } catch {
      /* ignore */
    }
  };

  const handlePayAppClick = (appId) => {
    setSelectedPayApp(appId);
    if (!paymentDetails?.upiId) {
      setError("Payment details not loaded. Please try again.");
      return;
    }
    if (!amountValid) {
      setError("Invalid payment amount.");
      return;
    }
    setError("");
    openPaymentApp(appId, {
      upiId: paymentDetails.upiId,
      payeeName: paymentDetails.payeeName,
      amount: amountParam,
      note: paymentDetails.note });
  };

  const pasteReference = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setReference(text.trim());
    } catch {
      setError("Could not paste from clipboard");
    }
  };

  const handleDeposit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await requestDeposit({
        amount: amountParam,
        method: `${activeMethodId}-${channelId}`,
        reference: trimmedReference,
        proofUrl: proofPath });
      setSuccess({ amount: amountParam, reference: trimmedReference });
    } catch (err) {
      setError(err.response?.data?.message || "Deposit request failed");
    } finally {
      setLoading(false);
    }
  };

  if (error && !optionsReady) {
    return (
      <main className="arupi-pay-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", maxWidth: "480px", width: "100%", padding: "2rem 1.5rem", textAlign: "center", border: "1px solid rgba(220,38,38,0.15)" }}>
          <div style={{ width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <span style={{ color: "#dc2626", fontSize: "1.5rem", fontWeight: "bold" }}>!</span>
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#dc2626", margin: "0 0 0.5rem" }}>Payment Error</h2>
          <p style={{ fontSize: "0.95rem", color: "#555", margin: "0 0 1.5rem", lineHeight: "1.4" }}>{error}</p>
          <button onClick={() => router.replace("/wallet/deposit")} style={{ color: "var(--theme-text)", border: "none", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", width: "100%" }}>
            Go Back
          </button>
        </div>
      </main>
    );
  }

  if (!optionsReady) {
    return (
      <main className="arupi-pay-page">
        <div className="wallet-screen-loading">Loading payment...</div>
      </main>
    );
  }

  if (isCryptoFlow) {
    return (
      <DepositCryptoPayScreen
        amountUsdt={amountParam}
        inrAmount={cryptoInrAmount}
        methodId={methodIdParam}
        channelId={channelId}
        channelLabel={paymentDetails?.channelLabel || channelLabel}
        paymentDetails={paymentDetails}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={maintenanceMessage}
        blocksDeposit={blocksAction("deposit")}
      />
    );
  }

  if (paymentDetails?.type === "sunpays" && paymentDetails?.checkoutUrl) {
    return (
      <main className="arupi-pay-page" style={{ height: "100vh", width: "100%", margin: 0, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <header className="arupi-pay-header" style={{ flexShrink: 0, zIndex: 10 }}>
          <Link href="/wallet/deposit" className="arupi-pay-back" aria-label="Back">
            ‹
          </Link>
          <h1>Complete Payment</h1>
          <Link href="/account" className="arupi-pay-support">
            Customer Service
          </Link>
        </header>
        <div style={{ flex: 1, width: "100%", position: "relative" }}>
          <iframe
            src={paymentDetails.checkoutUrl}
            style={{ width: "100%", height: "100%", border: "none", position: "absolute", top: 0, left: 0 }}
            allow="payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation allow-top-navigation"
          />
        </div>
      </main>
    );
  }


  if (success) {
    return (
      <main className="arupi-pay-page arupi-success-page">
        <header className="arupi-pay-header">
          <span className="arupi-pay-back" />
          <h1>Payment submitted</h1>
          <span />
        </header>
        <section className="arupi-success-card">
          <div className="arupi-success-icon">✓</div>
          <h2>Request received</h2>
          <p>
            Your deposit of <strong>₹{formatAmount(success.amount)}</strong> is pending admin review.
          </p>
          <div className="arupi-success-actions">
            <Link href="/wallet/deposit/history" className="arupi-success-primary">
              View deposit history
            </Link>
            <button type="button" className="arupi-success-secondary" onClick={() => router.push("/wallet")}>
              Back to wallet
            </button>
          </div>
        </section>
      </main>
    );
  }

  const pageTitle = paymentDetails?.channelLabel || channelLabel || "UPI Pay";
  const selectedPayAppLabel = PAY_APP_OPTIONS.find((item) => item.id === selectedPayApp)?.label || "Paytm";
  const reminders = [
    "Do not pay for the same link repeatedly!",
    `${selectedPayAppLabel} is wake up support!`,
  ];

  return (
    <main className="arupi-pay-page">
      <header className="arupi-pay-header">
        <Link href="/wallet/deposit" className="arupi-pay-back" aria-label="Back">
          ‹
        </Link>
        <h1>{pageTitle}</h1>
        <Link href="/account" className="arupi-pay-support">
          Customer Service
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="arupi-pay-error">{maintenanceMessage || "Deposits unavailable."}</div>
      ) : null}

      <div className="arupi-pay-amount-bar">
        <div className="arupi-pay-amount-left">
          <strong>₹{formatAmount(amountParam)}</strong>
          <button type="button" className="arupi-pay-copy-icon" onClick={copyAmount} aria-label="Copy amount">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
              <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </button>
          {activeMethod?.badge ? (
            <span className="arupi-pay-discount">Discount {activeMethod.badge}</span>
          ) : null}
        </div>
        <div className="arupi-pay-timer">{formatTimer(remainingSec)}</div>
      </div>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Choose a payment method to pay</h2>
        <div className="arupi-method-grid">
          {PAY_APP_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`arupi-method-card ${item.theme} ${selectedPayApp === item.id ? "active" : ""}`}
              onClick={() => handlePayAppClick(item.id)}
            >
              <div className="arupi-method-card-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.logo} alt="" className="arupi-method-logo" width={36} height={36} />
                <span className="arupi-method-name">{item.label}</span>
              </div>
              <strong className="arupi-method-support">Wake up support</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Use Mobile Scan code to pay</h2>
        <div className="arupi-qr-box" style={{ borderRadius: "16px", padding: "1.5rem", boxShadow: "0 8px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          <div className="arupi-qr-frame" style={{ border: "2px solid #f1f5f9", borderRadius: "12px", padding: "12px", display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            {(() => {
              const chLower = String(channelId || searchChannel || "").toLowerCase();
              const methLower = String(activeMethodId || searchMethod || "").toLowerCase();
              
              let templateSrc = null;
              if (chLower.includes("upixqr") || methLower.includes("upixqr")) {
                templateSrc = "/upixqr_template.jpg";
              } else if (chLower.includes("paytm") || methLower.includes("paytm")) {
                templateSrc = "/paytmxqr_template.jpg";
              }
              
              if (templateSrc) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={templateSrc} alt="Payment QR" style={{ width: "260px", height: "260px", objectFit: "contain", borderRadius: "8px" }} />
                );
              }
              
              return upiUri ? (
                <QRCodeCanvas value={upiUri} size={220} level="M" includeMargin />
              ) : (
                <p style={{ color: "#64748b" }}>Loading QR...</p>
              );
            })()}
          </div>
          
          {paymentDetails?.upiId && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.875rem", borderRadius: "12px", border: "1px solid #edf2f7", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>UPI ID / VPA</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1e293b", wordBreak: "break-all" }}>{paymentDetails.upiId}</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(paymentDetails.upiId);
                      alert("UPI ID Copied successfully!");
                    } catch {}
                  }}
                  style={{ flexShrink: 0, padding: "0.375rem 0.75rem", borderRadius: "8px", color: "var(--theme-text)", border: "none", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer" }}
                >
                  Copy VPA
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const canvas = document.querySelector(".arupi-qr-frame canvas");
              if (canvas) {
                const url = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = `luckynova_deposit_qr_${amountParam}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
            style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", color: "#2c1f05", border: "none", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", boxShadow: "0 4px 12px rgba(71, 129, 255, 0.1)", marginBottom: "1.25rem" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download QR Code
          </button>

          <ol className="arupi-qr-steps" style={{ listStyleType: "decimal", paddingLeft: "1rem", margin: 0 }}>
            {QR_STEPS.map((step) => (
              <li key={step} style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: "1.5", marginBottom: "0.25rem" }}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Input UTR/ Paste UTR</h2>
        <p className="arupi-utr-warning">If you do not back fill UTR/ paste UTR, 100% will fail.</p>
        <div className={`arupi-utr-field ${hasValidReference ? "valid" : ""}`}>
          <input
            type="text"
            placeholder="Input 12 digits here"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            inputMode="numeric"
          />
          <button type="button" className="arupi-utr-paste" onClick={pasteReference}>
            Paste
          </button>
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Upload payment screenshot</h2>
        <p className="arupi-utr-warning">
          Payment screenshot is mandatory. Deposits without proof will not be processed.
        </p>
        <DepositProofUploadField
          proofPath={proofPath}
          previewUrl={proofPreviewUrl}
          disabled={loading}
          onProofChange={(nextPath, nextPreviewUrl) => {
            setProofPath(nextPath);
            setProofPreviewUrl(nextPreviewUrl);
          }}
        />
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Important reminder:</h2>
        <ol className="arupi-reminders">
          {reminders.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ol>
      </section>

      {error ? <div className="arupi-pay-error">{error}</div> : null}

      <div className="arupi-pay-footer">
        <Link href="/wallet/deposit" className="arupi-pay-cancel">
          Cancel
        </Link>
        <button
          type="button"
          className={`arupi-pay-submit ${canSubmit ? "ready" : ""}`}
          disabled={!canSubmit}
          onClick={handleDeposit}
        >
          {loading
            ? "Submitting..."
            : !hasValidProof
              ? "Submit (screenshot required)"
              : hasValidReference
                ? "Submit"
                : "Submit (UTR not entered)"}
        </button>
      </div>
    </main>
  );
}

export default function DepositPayPage() {
  return (
    <Suspense
      fallback={
        <main className="arupi-pay-page">
          <div className="wallet-screen-loading">Loading payment...</div>
        </main>
      }
    >
      <DepositPayContent />
    </Suspense>
  );
}
