"use client";

import { useEffect, useState } from "react";

const PROMOTIONS_DATA = [
  {
    id: "deposit_bonus",
    title: "DEPOSIT BONUS",
    bannerText: "DEPOSIT BONUS",
    image: "/design/banners/deposit_bonus.jpg",
    details: {
      summary: "Bonus for each deposit for members. The reward is credited automatically immediately after depositing, with no limit on the number of times it can be received.",
      tableHeaders: ["DEPOSIT AMOUNT", "BONUS"],
      tableRows: [
        ["5$", "1$"],
        ["10$", "2$"],
        ["20$", "3$"],
        ["50$", "5$"],
        ["100$", "20$"]
      ],
      notesTitle: "TERMS & CONDITIONS (1x Bonus Flow)",
      notes: [
        "The offer and rewards are settled in USDT, based on the Singapore Standard Time Zone (UTC+8).",
        "If any agent or member is found to have duplicate accounts, use multiple accounts, engage in fraudulent activities, abuse policies, or make unauthorized withdrawals, LuckyNova reserves the right to revoke all benefits and profits, terminate participation, and freeze or suspend the account along with all associated balances.",
        "In the event of a dispute, LuckyNova may require users to provide valid identification and supporting documents as a mandatory condition to receive any benefits or event rewards.",
        "LuckyNova reserves the full right to interpret, modify, or terminate the event without prior notice. All final decisions rest with LuckyNova."
      ]
    }
  },
  {
    id: "vip33_salary",
    title: "DEPOSIT BASE SALARY",
    bannerText: "UNIQUE VIP33 EXCLUSIVE",
    image: "/design/banners/vip33_salary.jpg",
    details: {
      summary: "1 to 6 Tier deposit base system. Sub-agents earn based on same just direct 1 data. Running ads agents must cover their own ad costs upfront and keep receipts for reimbursement (up to 10k per submission).",
      features: [
        "Daily Salary Every Day",
        "1 to 6 Tier Earning System",
        "Unlimited Team Income",
        "100% Safe & Secure System"
      ],
      tableHeaders: ["TIER", "BASE SALARY RATE"],
      tableRows: [
        ["Tier 1-6", "15% Deposit Base Salary"]
      ],
      notesTitle: "IMPORTANT NOTES",
      notes: [
        "Same IP, bank account or any payment data cannot be used for salary collection.",
        "If your team has no profit, only 1-3% of salaries will be issued. No profit within 10 days means no salary, only betting commissions.",
        "New agents have a 7-day support period.",
        "If the agent does not recruit new members within 3 days, they will lose their daily salary qualification. When the conditions are met, the salary can be paid.",
        "Advertising support is for new agents only, for 15 days. If agents fail to bring any profit, Luckynova reserves the right to modify or cancel the salary model."
      ]
    }
  },
  {
    id: "weekly_accumulated",
    title: "WEEKLY ACCUMULATED BONUS",
    bannerText: "DEPOSIT 10000 BONUS 10000",
    image: "/design/banners/weekly_accumulated.jpg",
    details: {
      summary: "The total deposits made from Monday 00:00 to Sunday 23:59 (UTC+8) will be accumulated. The bonus will be credited on every Monday.",
      tableHeaders: ["DEPOSIT AMOUNT (WEEKLY)", "BONUS"],
      tableRows: [
        ["EXCEED 100$", "5$"],
        ["EXCEED 200$", "20$"],
        ["EXCEED 500$", "30$"]
      ],
      notesTitle: "TERMS & CONDITIONS",
      notes: [
        "This offer uses USDT as the payment currency and follows Singapore Standard Time (UTC+8).",
        "The bonus must be wagered once before withdrawal.",
        "Each account and each IP address is eligible to receive the bonus only once.",
        "If any bonus abuse or fraudulent activity is detected, the bonus will be confiscated and withdrawals will not be processed. LuckyNova reserves the right of final interpretation of this event.",
        "Please contact the agent on end of the week to claim the bonus. Late claims will be considered void."
      ]
    }
  },
  {
    id: "share_promotions",
    title: "INVITE & ACCUMULATE MEMBERS EVENT",
    bannerText: "SHARE PROMOTIONS MIN 51RS, BONUS UNLIMITED",
    image: "/design/banners/share_promotions.jpg",
    details: {
      summary: "Total deposit of 10 USDT required. The reward is credited automatically immediately after depositing, with no limit on the number of times it can be received.",
      tableHeaders: ["MEMBERS", "BONUS", "EXPLANATION"],
      tableRows: [
        ["1 - 5", "2 USDT / member", "Accumulate 1-5 members to receive 2 USDT per member"],
        ["6 - 20", "2.5 USDT / member", "Accumulate 6-20 members to receive 2.5 USDT per member"],
        ["21+", "3 USDT / member", "Accumulate 21 or more members to receive 3 USDT per member"]
      ],
      notesTitle: "TERMS & CONDITIONS (1x Bonus Flow)",
      notes: [
        "The offer uses USDT as the payment currency, Singapore Standard Time Zone (UTC+8).",
        "Members are required to link complete information.",
        "If the agent engages in duplicate registration or registers multiple accounts, LuckyNova reserves the right to cancel or revoke benefits, profits, or delete the agent's rights.",
        "The offer is specifically designed for members. If any individual is found to withdraw rewards or engage in dishonest behavior, such as abusing LuckyNova's benefits, LuckyNova reserves the right to freeze or cancel the account and its balance.",
        "In the case of a dispute between members regarding the event, LuckyNova officials have the right to request that members provide complete and valid documents to verify whether they are entitled to the privilege, in order to ensure the rights of both parties and prevent identity theft.",
        "LuckyNova reserves the right to have the final explanation regarding the event, as well as the right to modify and terminate the event without prior notice."
      ]
    }
  }
];

export default function PromoSection() {
  const [activePromo, setActivePromo] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#promo") return;
    const el = document.getElementById("promo");
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  return (
    <section id="promo" className="club-promo-section" aria-label="Promotions">
      <div className="club-promo-heading">
        <h2 style={{ fontSize: "1.25rem", color: "var(--theme-green)", borderLeft: "4px solid #D4AF37", paddingLeft: "8px" }}>
          Promotions
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {PROMOTIONS_DATA.map((promo) => (
          <div
            key={promo.id}
            onClick={() => setActivePromo(promo)}
            style={{
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: "16px",
              border: "1px solid rgba(71, 129, 255, 0.1)",
              backgroundImage: `url(${promo.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease" }}
            className="club-promo-banner-hover"
          />
        ))}
      </div>

      {/* Details Dialog Modal */}
      {activePromo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out" }}
          onClick={() => setActivePromo(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "85vh",
              overflowY: "auto",
              border: "1px solid rgba(71, 129, 255, 0.1)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.05), 0 0 30px rgba(71, 129, 255, 0.1)",
              animation: "scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "var(--theme-green)", textTransform: "uppercase" }}>
                {activePromo.title}
              </h3>
              <div style={{ height: "2px", width: "60px", margin: "8px auto" }} />
            </div>

            {/* Summary */}
            <p style={{ fontSize: "0.85rem", color: "#ECECEC", lineHeight: "1.5", marginBottom: "20px", padding: "12px", borderRadius: "12px", border: "1px solid var(--theme-border)" }}>
              {activePromo.details.summary}
            </p>

            {/* Features (if VIP) */}
            {activePromo.details.features && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {activePromo.details.features.map((feat, idx) => (
                  <div
                    key={idx}
                    style={{ border: "1px solid rgba(71, 129, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      color: "#E7C66A",
                      textAlign: "center" }}
                  >
                    {feat}
                  </div>
                ))}
              </div>
            )}

            {/* Table Chart */}
            {activePromo.details.tableRows && (
              <div style={{ marginBottom: "24px", overflow: "hidden", borderRadius: "12px", border: "1px solid rgba(71, 129, 255, 0.1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid rgba(71, 129, 255, 0.1)" }}>
                      {activePromo.details.tableHeaders.map((header, idx) => (
                        <th key={idx} style={{ padding: "12px 14px", fontWeight: "800", color: "var(--theme-green)", textTransform: "uppercase" }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePromo.details.tableRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        style={{
                          background: rowIdx % 2 === 0 ? "#121214" : "#1A1A1E",
                          borderBottom: rowIdx !== activePromo.details.tableRows.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none"
                        }}
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            style={{
                              padding: "12px 14px",
                              color: cellIdx === 1 ? "#E7C66A" : "#FFFFFF",
                              fontWeight: cellIdx === 1 ? "700" : "normal"
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Terms and Conditions List */}
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--theme-green)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                📜 {activePromo.details.notesTitle}
              </h4>
              <ol style={{ paddingLeft: "16px", color: "#A9A9A9", fontSize: "0.78rem", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "8px" }}>
                {activePromo.details.notes.map((note, idx) => (
                  <li key={idx} style={{ listStyleType: "decimal" }}>
                    {note}
                  </li>
                ))}
              </ol>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setActivePromo(null)}
              style={{
                width: "100%",
                color: "var(--theme-text)",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                fontWeight: "900",
                fontSize: "0.9rem",
                cursor: "pointer",
                marginTop: "24px",
                boxShadow: "0 6px 20px rgba(71, 129, 255, 0.1)",
                transition: "transform 0.1s ease" }}
              onMouseDown={(e) => { e.target.style.transform = "scale(0.98)" }}
              onMouseUp={(e) => { e.target.style.transform = "scale(1)" }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Hover styling rules */}
      <style jsx global>{`
        .club-promo-banner-hover {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s ease !important;
        }
        .club-promo-banner-hover:hover {
          transform: scale(1.02) !important;
          border-color: rgba(71, 129, 255, 0.1) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
