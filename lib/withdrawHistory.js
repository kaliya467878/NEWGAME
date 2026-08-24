export const getWithdrawMethodKind = (method = "", accountDetails = null) => {
  const details = accountDetails || {};
  const id = String(method || "").trim().toLowerCase();

  if (id.includes("usdt") || id.includes("crypto") || id.includes("trc")) return "usdt";
  if (id.includes("bank")) return "bank";
  if (id.includes("upi")) return "upi";

  if (details.walletAddress || details.cryptoAddress || details.address) return "usdt";
  if (details.accountNumber || details.bankCardNumber || details.ifsc) return "bank";
  if (details.upiId) return "upi";

  return "upi";
};

export const getWithdrawMethodMeta = (withdrawal) => {
  if (!withdrawal) return { kind: "upi", icon: "📱", label: "UPI" };

  let noteDetails = {};
  if (withdrawal.note) {
    try {
      noteDetails = JSON.parse(withdrawal.note);
    } catch {}
  }

  const method = withdrawal.method || noteDetails.method || "";
  const details = withdrawal.accountDetails || noteDetails.accountDetails || {};
  const kind = getWithdrawMethodKind(method, details);

  if (kind === "usdt") {
    return { kind, icon: "💎", label: "USDT · TRC20" };
  }
  if (kind === "bank") {
    return { kind, icon: "🏦", label: "Bank transfer" };
  }
  return { kind, icon: "📱", label: "UPI" };
};

const maskAccountNumber = (value = "") => {
  const str = String(value).replace(/\s/g, "");
  if (str.length <= 4) return str;
  if (str.length <= 10) return `${str.slice(0, 3)}****${str.slice(-2)}`;
  return `${str.slice(0, 6)}****${str.slice(-3)}`;
};

const maskWalletAddress = (value = "") => {
  const str = String(value).trim();
  if (str.length <= 12) return str;
  return `${str.slice(0, 8)}...${str.slice(-6)}`;
};

export const getWithdrawAccountLine = (withdrawal) => {
  if (!withdrawal) return null;

  let noteDetails = {};
  if (withdrawal.note) {
    try {
      noteDetails = JSON.parse(withdrawal.note);
    } catch {}
  }

  const method = withdrawal.method || noteDetails.method || "";
  const details = withdrawal.accountDetails || noteDetails.accountDetails || {};
  const kind = getWithdrawMethodKind(method, details);

  if (kind === "usdt") {
    if (!details.walletAddress && !details.cryptoAddress && !details.address) return null;
    return `TRC20 · ${maskWalletAddress(details.walletAddress || details.cryptoAddress || details.address)}`;
  }

  if (kind === "bank") {
    const parts = [];
    if (details.accountName || details.bankCardHolder) parts.push(details.accountName || details.bankCardHolder);
    if (details.accountNumber || details.bankCardNumber) parts.push(`A/C · ${maskAccountNumber(details.accountNumber || details.bankCardNumber)}`);
    if (details.ifsc) parts.push(details.ifsc);
    return parts.length ? parts.join(" · ") : null;
  }

  if (details.upiId) return `UPI · ${details.upiId}`;
  return null;
};

export const formatWithdrawStatus = (status) => {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const formatWithdrawAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const getWithdrawItemId = (withdrawal) =>
  withdrawal?.id || withdrawal?._id || "";

export const getWithdrawItemDate = (withdrawal) =>
  withdrawal?.createdAt || withdrawal?.requestedAt || withdrawal?.updatedAt || null;
