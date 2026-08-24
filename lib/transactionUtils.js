const CREDIT_TYPES = new Set([
  "deposit",
  "winning_credit",
  "referral_bonus",
  "bonus_credit",
  "locked_release",
  "credit",
]);

export const TRANSACTION_TYPE_LABELS = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bet_deduction: "Bet placed",
  winning_credit: "Win payout",
  referral_bonus: "Referral reward",
  admin_adjustment: "Adjustment",
  credit: "Credit",
  debit: "Debit",
  bonus_credit: "Bonus",
  bonus_debit: "Bonus used",
  locked_release: "Released",
};

export const TRANSACTION_TYPE_OPTIONS = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposit" },
  { id: "withdrawal", label: "Withdraw" },
  { id: "bet_deduction", label: "Bets" },
  { id: "winning_credit", label: "Wins" },
  { id: "referral_bonus", label: "Referral" },
  { id: "bonus_credit", label: "Bonus" },
];

export const formatTransactionType = (type) =>
  TRANSACTION_TYPE_LABELS[type] || type?.replace(/_/g, " ") || "Transaction";

export const isCreditTransaction = (type, amount = 0) => {
  if (type === "admin_adjustment") {
    return amount >= 0;
  }
  return CREDIT_TYPES.has(type);
};

export const formatTransactionAmount = (transaction) => {
  const credit = isCreditTransaction(transaction.type, transaction.amount);
  const prefix = credit ? "+" : "−";
  const absAmount = Math.abs(transaction.amount || 0);
  return `${prefix}₹${Number(absAmount).toFixed(2)}`;
};

export const formatTransactionStatus = (status) => {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
};
