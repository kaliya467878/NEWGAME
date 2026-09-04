"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DT_ASSETS,
  dtCardSrc,
  dtChipSrc,
  dtHistorySrc,
} from "@/lib/dragonTigerAssets";

const ROUND_SECONDS = 30;
const LOCK_SECONDS = 5;
const CHIP_VALUES = [1, 2, 5, 10, 25, 50];
const MOCK_POOL = { dragon: 4856, tiger: 5442, tie: 5280 };

const DEMO_HISTORY = ["tiger", "tiger", "dragon", "dragon", "tie", "dragon", "tiger", "dragon", "tiger", "tiger"];

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["S", "H", "D", "C"];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i + 1]));

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function drawCard() {
  return { rank: pick(RANKS), suit: pick(SUITS) };
}

function compareOutcome(dragon, tiger) {
  const d = RANK_VALUE[dragon.rank];
  const t = RANK_VALUE[tiger.rank];
  if (d > t) return "dragon";
  if (t > d) return "tiger";
  return "tie";
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function zoneLabel(zone) {
  if (zone === "dragon") return "Dragon";
  if (zone === "tiger") return "Tiger";
  return "Tie";
}

export default function DragonTigerMockScreen() {
  const [phase, setPhase] = useState("betting"); // betting | locked | reveal
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [chip, setChip] = useState(1);
  const [balance, setBalance] = useState(210);
  const [stakes, setStakes] = useState({ dragon: 0, tiger: 0, tie: 0 });
  const [history, setHistory] = useState(DEMO_HISTORY);
  const [dragonCard, setDragonCard] = useState({ rank: "6", suit: "S" });
  const [tigerCard, setTigerCard] = useState({ rank: "9", suit: "D" });
  const [showFaces, setShowFaces] = useState(true);
  const [lastResult, setLastResult] = useState("tiger");
  const [toast, setToast] = useState("UI mock — wallet API later");
  const roundRef = useRef(0);

  const totalBet = stakes.dragon + stakes.tiger + stakes.tie;
  const canBet = phase === "betting" && seconds > LOCK_SECONDS;

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          roundRef.current += 1;
          return ROUND_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (seconds > LOCK_SECONDS) {
      setPhase("betting");
      return;
    }
    if (seconds > 0) {
      setPhase((prev) => {
        if (prev === "betting") {
          setShowFaces(false);
          setToast("Betting locked — cards soon");
          return "locked";
        }
        return prev;
      });
      return;
    }
  }, [seconds]);

  // Settle when a new round starts (seconds jumps back to ROUND_SECONDS after 0)
  const prevSeconds = useRef(seconds);
  useEffect(() => {
    const wasZeroish = prevSeconds.current === 1 && seconds === ROUND_SECONDS;
    prevSeconds.current = seconds;
    if (!wasZeroish) return;

    const d = drawCard();
    const t = drawCard();
    const outcome = compareOutcome(d, t);
    setDragonCard(d);
    setTigerCard(t);
    setShowFaces(true);
    setPhase("reveal");
    setLastResult(outcome);
    setHistory((h) => [outcome, ...h].slice(0, 16));

    setStakes((current) => {
      const winStake = current[outcome] || 0;
      const mult = outcome === "tie" ? 9 : 2;
      const credit = winStake * mult;
      const spent = current.dragon + current.tiger + current.tie;
      if (spent > 0) {
        setBalance((b) => b - spent + credit);
        if (credit > 0) setToast(`Mock win ₹${credit} on ${zoneLabel(outcome)}`);
        else setToast(`Mock round — ${zoneLabel(outcome)} won`);
      } else {
        setToast(`Mock result: ${zoneLabel(outcome)}`);
      }
      return { dragon: 0, tiger: 0, tie: 0 };
    });

    const tmr = setTimeout(() => {
      setPhase("betting");
      setToast("Place mock bets — no real money");
    }, 1800);
    return () => clearTimeout(tmr);
  }, [seconds]);

  const placeOn = (zone) => {
    if (!canBet) {
      setToast(phase === "locked" ? "Bets locked" : "Wait for next round");
      return;
    }
    if (balance < chip + totalBet) {
      setToast("Mock balance low — tap Reset");
      return;
    }
    setStakes((s) => ({ ...s, [zone]: s[zone] + chip }));
    setToast(`+₹${chip} on ${zoneLabel(zone)}`);
  };

  const resetMock = () => {
    setBalance(210);
    setStakes({ dragon: 0, tiger: 0, tie: 0 });
    setChip(1);
    setSeconds(ROUND_SECONDS);
    setPhase("betting");
    setShowFaces(true);
    setDragonCard({ rank: "6", suit: "S" });
    setTigerCard({ rank: "9", suit: "D" });
    setToast("Mock reset");
  };

  const timerClass = useMemo(() => {
    if (seconds <= LOCK_SECONDS) return "dt-timer danger";
    if (seconds <= 10) return "dt-timer warn";
    return "dt-timer";
  }, [seconds]);

  return (
    <div className="dt-mock">
      <div className="dt-stage" style={{ backgroundImage: `url(${DT_ASSETS.art.stageBg})` }}>
        <header className="dt-topbar">
          <Link href="/" className="dt-back" aria-label="Back">
            ‹
          </Link>
          <div className="dt-top-title">
            <span className="dt-mock-badge">MOCK</span>
            <strong>Dragon vs Tiger</strong>
          </div>
          <div className="dt-top-actions">
            <button type="button" className="dt-icon-btn" onClick={resetMock} title="Reset mock">
              ↺
            </button>
            <img src={DT_ASSETS.icons.sound} alt="" width={28} height={28} />
            <img src={DT_ASSETS.icons.globe} alt="" width={28} height={28} />
          </div>
        </header>

        <div className="dt-dealer-wrap">
          <div className={timerClass}>
            <img src={DT_ASSETS.icons.clock} alt="" width={22} height={22} />
            <span>{String(seconds).padStart(2, "0")}</span>
          </div>
        </div>

        <div className="dt-cards">
          <div className={`dt-card-slot dragon ${lastResult === "dragon" && showFaces ? "winner" : ""}`}>
            <span className="dt-card-label">Dragon</span>
            <div className={`dt-card-flip ${showFaces ? "show" : ""}`}>
              <Image
                src={DT_ASSETS.art.cardBackPng}
                alt="Back"
                width={86}
                height={120}
                className="dt-card-face back"
              />
              <img
                src={dtCardSrc(dragonCard.rank, dragonCard.suit)}
                alt={`${dragonCard.rank}${dragonCard.suit}`}
                width={86}
                height={120}
                className="dt-card-face front"
              />
            </div>
          </div>
          <div className={`dt-card-slot tiger ${lastResult === "tiger" && showFaces ? "winner" : ""}`}>
            <span className="dt-card-label">Tiger</span>
            <div className={`dt-card-flip ${showFaces ? "show" : ""}`}>
              <Image
                src={DT_ASSETS.art.cardBackPng}
                alt="Back"
                width={86}
                height={120}
                className="dt-card-face back"
              />
              <img
                src={dtCardSrc(tigerCard.rank, tigerCard.suit)}
                alt={`${tigerCard.rank}${tigerCard.suit}`}
                width={86}
                height={120}
                className="dt-card-face front"
              />
            </div>
          </div>
        </div>

        {lastResult === "tie" && showFaces && phase === "reveal" ? (
          <div className="dt-tie-banner">TIE</div>
        ) : null}
      </div>

      <div className="dt-history" aria-label="Recent results">
        {history.map((outcome, i) => (
          <img
            key={`${outcome}-${i}`}
            src={dtHistorySrc(outcome)}
            alt={outcome}
            width={34}
            height={34}
          />
        ))}
      </div>

      <div className="dt-table">
        <button
          type="button"
          className={`dt-zone tie ${stakes.tie ? "has-bet" : ""} ${!canBet ? "locked" : ""}`}
          onClick={() => placeOn("tie")}
        >
          <img src={DT_ASSETS.art.tieEmblem} alt="" width={72} height={72} className="dt-zone-emblem" />
          <div className="dt-zone-meta">
            <strong>TIE</strong>
            <span>1:{8}</span>
          </div>
          <div className="dt-zone-pool">{formatMoney(MOCK_POOL.tie + stakes.tie)}</div>
          {stakes.tie > 0 ? <div className="dt-my-chip">₹{stakes.tie}</div> : null}
          <span className="dt-tap">Tap to play</span>
        </button>

        <div className="dt-zone-row">
          <button
            type="button"
            className={`dt-zone dragon ${stakes.dragon ? "has-bet" : ""} ${!canBet ? "locked" : ""}`}
            onClick={() => placeOn("dragon")}
          >
            <img src={DT_ASSETS.art.dragonEmblem} alt="" width={88} height={88} className="dt-zone-emblem" />
            <div className="dt-zone-meta">
              <strong>DRAGON</strong>
              <span>1:1</span>
            </div>
            <div className="dt-zone-pool">{formatMoney(MOCK_POOL.dragon + stakes.dragon)}</div>
            {stakes.dragon > 0 ? <div className="dt-my-chip">₹{stakes.dragon}</div> : null}
            <span className="dt-tap">Tap to play</span>
          </button>

          <button
            type="button"
            className={`dt-zone tiger ${stakes.tiger ? "has-bet" : ""} ${!canBet ? "locked" : ""}`}
            onClick={() => placeOn("tiger")}
          >
            <img src={DT_ASSETS.art.tigerEmblem} alt="" width={88} height={88} className="dt-zone-emblem" />
            <div className="dt-zone-meta">
              <strong>TIGER</strong>
              <span>1:1</span>
            </div>
            <div className="dt-zone-pool">{formatMoney(MOCK_POOL.tiger + stakes.tiger)}</div>
            {stakes.tiger > 0 ? <div className="dt-my-chip">₹{stakes.tiger}</div> : null}
            <span className="dt-tap">Tap to play</span>
          </button>
        </div>
      </div>

      <footer className="dt-footer">
        <div className="dt-user">
          <div className="dt-avatar">P</div>
          <div>
            <div className="dt-user-name">pappa_ji</div>
            <div className="dt-balance">₹ {formatMoney(balance)}</div>
          </div>
          <Link href="/wallet/deposit" className="dt-plus" aria-label="Deposit">
            <img src={DT_ASSETS.icons.plus} alt="" width={36} height={36} />
          </Link>
        </div>

        <div className="dt-total">
          <span>TOTAL BET</span>
          <strong>{formatMoney(totalBet)}</strong>
        </div>

        <div className="dt-chips" role="listbox" aria-label="Chip value">
          {CHIP_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`dt-chip ${chip === v ? "active" : ""}`}
              onClick={() => setChip(v)}
              aria-selected={chip === v}
            >
              <img src={dtChipSrc(v)} alt={`${v}`} width={44} height={44} />
            </button>
          ))}
        </div>

        <p className="dt-toast">{toast}</p>
      </footer>
    </div>
  );
}
