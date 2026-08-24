"use client";

import { useEffect, useState } from "react";
import { Trophy, BarChart3, Crown, Coins, CircleDashed, Dices, Ticket } from "lucide-react";

// Mock user list for generating live winning feed
const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80"
];

const USER_NAMES = [
  "REV", "LEQ", "SDU", "TEH", "FGB", "HXT", "JYJ", "4NK", "CCV", "G2M", "AXN", "QG5", "MVZ", "AMI", "G9D", "QDU"
];

const GAMES_LIST = [
  { name: "Win Go", icon: <CircleDashed size={14} className="text-red-400" /> },
  { name: "K3 Lot", icon: <Dices size={14} className="text-blue-400" /> },
  { name: "5D Lot", icon: <Ticket size={14} className="text-green-400" /> }
];

function generateWinningRow() {
  const user = `Mem***${USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)]}`;
  const game = GAMES_LIST[Math.floor(Math.random() * GAMES_LIST.length)];
  const amount = (Math.random() * 500 + 50).toFixed(2);
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  return { id: Math.random().toString(), user, game, amount, avatar };
}

export default function LobbyWidgets() {
  // Live winning feed state
  const [winnings, setWinnings] = useState([]);

  useEffect(() => {
    // Populate client-side immediately on mount to prevent SSR mismatch
    setWinnings(Array.from({ length: 6 }, () => generateWinningRow()));

    const interval = setInterval(() => {
      setWinnings((prev) => {
        const next = [generateWinningRow(), ...prev.slice(0, 5)];
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lobby-widgets-container">
      {/* WINNING INFORMATION SECTION */}
      <section className="widget-section">
        <div className="widget-header">
          <span className="widget-header-icon"><Trophy size={18} className="text-gold" /></span>
          <h2 className="widget-header-title">Winning information</h2>
        </div>

        <div className="winning-info-table">
          <div className="table-header-row">
            <span className="col-game">Game</span>
            <span className="col-user">User</span>
            <span className="col-amount">Winning amount</span>
          </div>

          <div className="table-body">
            {winnings.map((row) => (
              <div key={row.id} className="table-row animate-fade-in">
                <span className="col-game">
                  <span className="game-icon-badge">{row.game.icon}</span>
                  <span className="game-label">{row.game.name}</span>
                </span>
                <span className="col-user">
                  <img src={row.avatar} alt="avatar" className="user-avatar" />
                  <span className="user-name">{row.user}</span>
                </span>
                <span className="col-amount">
                  <span className="amount-text">₹{row.amount}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY'S EARNINGS CHART SECTION */}
      <section className="widget-section">
        <div className="widget-header">
          <span className="widget-header-icon"><BarChart3 size={18} className="text-gold" /></span>
          <h2 className="widget-header-title">Today's earnings chart</h2>
        </div>

        {/* Podium */}
        <div className="earnings-podium">
          {/* 2nd Place */}
          <div className="podium-col place-2">
            <div className="podium-avatar-wrap">
              <img src={AVATARS[1]} alt="2nd avatar" className="podium-avatar" />
              <div className="rank-badge badge-2">2</div>
            </div>
            <span className="podium-username">Mem***G9D</span>
            <div className="podium-bar bar-2">
              <span className="podium-num text-blue-light">02</span>
              <span className="podium-prize">₹52,150.00</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="podium-col place-1">
            <div className="podium-avatar-wrap">
              <div className="crown-badge"><Crown size={14} className="text-gold" /></div>
              <img src={AVATARS[0]} alt="1st avatar" className="podium-avatar" />
              <div className="rank-badge badge-1">1</div>
            </div>
            <span className="podium-username">Mem***QDU</span>
            <div className="podium-bar bar-1">
              <span className="podium-num text-gold-light">01</span>
              <span className="podium-prize">₹60,677.68</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="podium-col place-3">
            <div className="podium-avatar-wrap">
              <img src={AVATARS[2]} alt="3rd avatar" className="podium-avatar" />
              <div className="rank-badge badge-3">3</div>
            </div>
            <span className="podium-username">Mem***AMI</span>
            <div className="podium-bar bar-3">
              <span className="podium-num text-pink-light">03</span>
              <span className="podium-prize">₹44,590.00</span>
            </div>
          </div>
        </div>

        {/* 4th-10th List */}
        <div className="earnings-list">
          {[
            { rank: 4, name: "Mem***AXN", amount: "₹41,778.00", avatar: AVATARS[3] },
            { rank: 5, name: "Mem***QG5", amount: "₹36,260.00", avatar: AVATARS[4] },
            { rank: 6, name: "Mem***MVZ", amount: "₹30,420.00", avatar: AVATARS[5] },
            { rank: 7, name: "Mem***JYJ", amount: "₹19,040.76", avatar: AVATARS[1] },
            { rank: 8, name: "Mem***4NK", amount: "₹18,204.48", avatar: AVATARS[2] },
            { rank: 9, name: "Mem***CCV", amount: "₹17,964.10", avatar: AVATARS[3] },
            { rank: 10, name: "Mem***G2M", amount: "₹14,700.00", avatar: AVATARS[4] }
          ].map((item) => (
            <div key={item.rank} className="earnings-list-row">
              <div className="row-left">
                <span className="rank-num">{item.rank}</span>
                <img src={item.avatar} alt="avatar" className="list-avatar" />
                <span className="list-username">{item.name}</span>
              </div>
              <span className="list-amount">{item.amount}</span>
            </div>
          ))}
        </div>
      </section>

      <style jsx global>{`
        .lobby-widgets-container {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 24px;
        }
        .widget-section {
          background: var(--theme-bg-card);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.25rem 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(8px);
        }
        .widget-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
        }
        .widget-header-icon {
          font-size: 18px;
        }
        .widget-header-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--theme-text);
          letter-spacing: 0.5px;
          margin: 0;
        }
        
        /* Winning Table */
        .winning-info-table {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .table-header-row {
          display: flex;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .col-game { flex: 1.2; display: flex; align-items: center; gap: 8px; text-align: left; }
        .col-user { flex: 1.5; display: flex; align-items: center; gap: 8px; text-align: left; }
        .col-amount { flex: 1; text-align: right; }
        
        .table-body {
          display: flex;
          flex-direction: column;
          min-height: 240px;
          overflow: hidden;
        }
        .table-row {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.03);
          font-size: 12px;
          height: 38px;
          box-sizing: border-box;
        }
        .animate-fade-in {
          animation: slide-row-down 0.4s ease-out forwards;
        }
        @keyframes slide-row-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .game-icon-badge {
          font-size: 14px;
        }
        .game-label {
          color: var(--theme-text);
          font-weight: 600;
        }
        .user-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-name {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
        .coin-icon {
          font-size: 12px;
        }
        .amount-text {
          color: #10b981;
          font-weight: 700;
        }

        /* Earnings Podium */
        .earnings-podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-top: 16px;
        }
        .podium-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        .podium-avatar-wrap {
          position: relative;
          margin-bottom: 8px;
        }
        .crown-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 14px;
          animation: bounce-crown 2s infinite ease-in-out;
        }
        @keyframes bounce-crown {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        .podium-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid;
        }
        .place-1 .podium-avatar { border-color: #d4af37; width: 52px; height: 52px; }
        .place-2 .podium-avatar { border-color: #60a5fa; }
        .place-3 .podium-avatar { border-color: #f472b6; }
        
        .rank-badge {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 800;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge-1 { background: #d4af37; color: #111; }
        .badge-2 { background: #60a5fa; color: var(--theme-text); }
        .badge-3 { background: #f472b6; color: var(--theme-text); }

        .podium-username {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 6px;
          font-weight: 500;
        }
        .podium-bar {
          width: 100%;
          border-radius: 12px 12px 0 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          box-sizing: border-box;
          gap: 2px;
        }
        .bar-1 {
          background: linear-gradient(180deg, rgba(71, 129, 255, 0.1), rgba(71, 129, 255, 0.1));
          border: 1px solid rgba(71, 129, 255, 0.1);
          border-bottom: none;
          height: 85px;
        }
        .bar-2 {
          background: linear-gradient(180deg, rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.02));
          border: 1px solid rgba(96, 165, 250, 0.2);
          border-bottom: none;
          height: 65px;
        }
        .bar-3 {
          background: linear-gradient(180deg, rgba(244, 114, 182, 0.15), rgba(244, 114, 182, 0.02));
          border: 1px solid rgba(244, 114, 182, 0.2);
          border-bottom: none;
          height: 55px;
        }
        .podium-num {
          font-size: 13px;
          font-weight: 800;
        }
        .text-gold { color: #d4af37; }
        .text-gold-light { color: #ffeaa0; }
        .text-blue-light { color: #93c5fd; }
        .text-pink-light { color: #fbcfe8; }

        .podium-prize {
          font-size: 10px;
          color: var(--theme-text);
          font-weight: 700;
        }

        /* 4th-10th List */
        .earnings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .earnings-list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          box-sizing: border-box;
        }
        .row-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rank-num {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          width: 14px;
        }
        .list-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .list-username {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
        .list-amount {
          font-size: 12px;
          color: #10b981;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
