"use client";
import { X } from "lucide-react";

// A flat 2% bet fee applies to every Wingo bet type. A 100 bet has a 98
// "contract amount"; these payouts are the fair odds (2x color/size, 4.5x
// violet, 1.0x partial-violet, 9x number) net of that 2% fee.
const DEFAULT_PAYOUTS = {
  green: 1.96,
  red: 1.96,
  violet: 4.41,
  big_small: 1.96,
  partial_violet: 0.98,
  number: 8.82 };

const RULE_SECTIONS = [
  {
    title: "Color bets",
    items: [
      { label: "Green", detail: "Wins on 1, 3, 7, 9", tag: "green", payoutKey: "green" },
      { label: "Red", detail: "Wins on 2, 4, 6, 8", tag: "red", payoutKey: "red" },
      { label: "Violet", detail: "Wins on 0 or 5", tag: "violet", payoutKey: "violet" },
    ] },
  {
    title: "Size bets",
    items: [
      { label: "Small", detail: "Wins on numbers 0–4", tag: "orange", payoutKey: "big_small" },
      { label: "Big", detail: "Wins on numbers 5–9", tag: "blue", payoutKey: "big_small" },
    ] },
  {
    title: "Number bet",
    items: [
      {
        label: "Exact number",
        detail: "Pick any single digit 0–9",
        tag: "green",
        payoutKey: "number" },
    ] },
];

const PRE_SALE_NOTES = [
  "Bets placed before the result is declared are pre-sale bets.",
  "When 5 seconds or less remain, betting is locked for that round.",
  "Total stake = base amount × quantity × multiplier.",
  "Every bet carries a flat 2% bet fee — a 100 bet has a 98 contract amount, and payouts above are already net of that fee.",
  "If you bet Green or Red and the result is Violet (0 or 5), that's a partial win at 1x instead of the full color payout (98 contract amount × 1x = 98).",
  "Violet payouts are 4.5x (98 contract amount × 4.5x = 441.00).",
  "Number payouts are 9x (98 contract amount × 9x = 882).",
  "Winnings are credited automatically after the result is announced.",
  "By placing a bet you confirm you understand these rules.",
];

const formatPayout = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return Number.isInteger(amount) ? `${amount}x` : `${amount.toFixed(2)}x`;
};

export default function PreSaleRulesModal({ open, onClose, payouts = DEFAULT_PAYOUTS }) {
  if (!open) return null;

  const activePayouts = { ...DEFAULT_PAYOUTS, ...payouts };

  return (
    <div className="wg-rules-overlay" onClick={onClose} role="presentation">
      <div
        className="wg-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wg-rules-title"
      >
        <div className="wg-rules-header">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wg-rules-header-icon" style={{ marginRight: "12px", flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <div>
            <p className="wg-rules-kicker">WinGo</p>
            <h2 id="wg-rules-title">Pre-sale rules</h2>
          </div>
          <button type="button" className="wg-rules-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="wg-rules-body">
          <section className="wg-rules-section">
            <h3>How to play</h3>
            <p className="wg-rules-intro">
              Choose a color, number, or size before the timer ends. If your selection matches the
              result, you win according to the payout below.
            </p>
          </section>

          {RULE_SECTIONS.map((section) => (
            <section key={section.title} className="wg-rules-section">
              <h3>{section.title}</h3>
              <ul className="wg-rules-list">
                {section.items.map((item) => (
                  <li key={item.label} className="wg-rules-item">
                    <span className={`wg-rules-tag wg-rules-tag-${item.tag}`}>{item.label}</span>
                    <div className="wg-rules-item-copy">
                      <span>{item.detail}</span>
                      <strong>Payout {formatPayout(activePayouts[item.payoutKey])}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="wg-rules-section">
            <h3>Special results</h3>
            <div className="wg-rules-special">
              <div className="wg-rules-special-card">
                <span className="wg-mini-ball v0">0</span>
                <p>Green + Violet</p>
                <strong>Green bet pays {formatPayout(activePayouts.partial_violet)}</strong>
              </div>
              <div className="wg-rules-special-card">
                <span className="wg-mini-ball v5">5</span>
                <p>Red + Violet</p>
                <strong>Red bet pays {formatPayout(activePayouts.partial_violet)}</strong>
              </div>
            </div>
          </section>

          <section className="wg-rules-section">
            <h3>Pre-sale terms</h3>
            <ul className="wg-rules-notes">
              {PRE_SALE_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="wg-rules-footer">
          <button type="button" className="wg-rules-ok" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
