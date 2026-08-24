"use client";

import styles from "./HowToPlayModal.module.css";

/**
 * Generic "How to Play" rules modal shared across games. Each game passes
 * its own `kicker` (game name), `intro`, `sections` (bet-type breakdown with
 * payout copy) and `notes` (terms list) — same overlay/dialog shape as
 * WinGo's PreSaleRulesModal, reused here instead of duplicated per game.
 */
/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   kicker?: string,
 *   title?: string,
 *   intro?: string,
 *   sections?: Array<{ title: string, items: Array<{ label: string, detail: string, tag?: string, payout?: string }> }>,
 *   notes?: string[],
 * }} props
 */
export default function HowToPlayModal({ open, onClose, kicker, title = "How to play", intro, sections = [], notes = [] }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="htp-title"
      >
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
            <h2 id="htp-title">{title}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {intro ? (
            <section className={styles.section}>
              <h3>How to play</h3>
              <p className={styles.intro}>{intro}</p>
            </section>
          ) : null}

          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h3>{section.title}</h3>
              <ul className={styles.list}>
                {section.items.map((item) => (
                  <li key={item.label} className={styles.item}>
                    <span className={`${styles.tag} ${styles[`tag${item.tag ? item.tag[0].toUpperCase() + item.tag.slice(1) : "Gold"}`] || styles.tagGold}`}>
                      {item.label}
                    </span>
                    <div className={styles.itemCopy}>
                      <span>{item.detail}</span>
                      {item.payout ? <strong>Payout {item.payout}</strong> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {notes.length ? (
            <section className={styles.section}>
              <h3>Terms</h3>
              <ul className={styles.notes}>
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.ok} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
