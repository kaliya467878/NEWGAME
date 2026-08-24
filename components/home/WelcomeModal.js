"use client";



export default function WelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <div style={{ textAlign: "center", paddingTop: "2rem", paddingBottom: "1rem", position: "relative" }}>
          <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "4px", fontWeight: "700", marginBottom: "4px" }}>WELCOME TO</div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "var(--theme-text)", letterSpacing: "1px" }}>
            LUCKY<span style={{ color: "var(--theme-green)" }}>NOVA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
            <div style={{ height: "1px", width: "40px" }}></div>
            <span style={{ color: "var(--theme-green)", fontSize: "10px" }}>✦</span>
            <div style={{ height: "1px", width: "40px" }}></div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "0 1.5rem 1.5rem", color: "#d1d5db", fontSize: "13px", lineHeight: "1.6" }}>
          <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", textAlign: "center" }}>
            A secure and rewarding gaming experience starts here.<br />
            Please make sure you are accessing the official <span style={{ color: "var(--theme-green)", fontWeight: "600" }}>LuckyNova</span> website only. Beware of fake platforms, imitation websites, and unauthorized agents claiming to represent <span style={{ color: "var(--theme-green)", fontWeight: "600" }}>LuckyNova</span>.
          </p>

          {/* Safety Section */}
          <div style={{ border: "1px solid rgba(71, 129, 255, 0.1)", borderRadius: "14px", padding: "16px", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--theme-green)", fontWeight: "700", fontSize: "12px", marginBottom: "12px" }}>
              <span>🛡️</span>
              <span>FOR YOUR SAFETY:</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#d1d5db" }}>
                <span style={{ color: "var(--theme-green)" }}>✓</span> Always verify our official website link
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#d1d5db" }}>
                <span style={{ color: "var(--theme-green)" }}>✓</span> Never share your login details or OTP with anyone
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#d1d5db" }}>
                <span style={{ color: "var(--theme-green)" }}>✓</span> Contact official support for any assistance
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#d1d5db" }}>
                <span style={{ color: "var(--theme-green)" }}>✓</span> Play responsibly and stay secure
              </li>
            </ul>
          </div>

          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <p style={{ color: "#c5a85c", fontWeight: "600", fontSize: "12px", marginBottom: "4px" }}>Thank you for choosing LuckyNova.</p>
            <p style={{ color: "#a1a1aa", fontSize: "12px" }}>We wish you a safe and enjoyable experience!</p>
          </div>

          {/* Official Link Button */}
          <a 
            href="https://www.luckynova11.site" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="link-btn-glow"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "10px", 
              border: "1px solid rgba(71, 129, 255, 0.1)", 
              borderRadius: "10px", 
              padding: "10px", 
              color: "var(--theme-text)", 
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "12px",
              marginBottom: "1.5rem",
              transition: "border-color 0.2s"
            }}
          >
            <span>🌐</span>
            <span>Official URL: <span style={{ color: "var(--theme-green)", marginLeft: "4px" }}>&gt; CLICK HERE &lt;</span></span>
          </a>

          {/* Confirm Button */}
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              width: "100%", 
              color: "var(--theme-text)", 
              border: "none", 
              padding: "12px", 
              borderRadius: "12px", 
              fontSize: "14px", 
              fontWeight: "800", 
              letterSpacing: "1px",
              cursor: "pointer", 
              boxShadow: "0 4px 12px rgba(71, 129, 255, 0.1)"
            }}
          >
            CONFIRM
          </button>
        </div>
      </div>

      <style jsx global>{`
        .welcome-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--theme-bg-card);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1rem;
          box-sizing: border-box;
          animation: fade-in 0.2s ease-out forwards;
        }
        .welcome-modal-card {
          width: 100%;
          max-width: 400px;
          background: var(--theme-bg-card);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
          border: 2px solid #aa841c;
          animation: scale-up 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
          background-image: 
            radial-gradient(circle at top left, rgba(71, 129, 255, 0.1) 0%, transparent 40%),
            radial-gradient(circle at top right, rgba(71, 129, 255, 0.1) 0%, transparent 40%);
        }
        @keyframes scale-up {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .link-btn-glow:hover {
          border-color: #e5c058 !important;
        }
      `}</style>
    </div>
  );
}
