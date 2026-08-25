"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppHeader from "./AppHeader";
import PromoBanner from "./PromoBanner";
import AnnouncementBar from "./AnnouncementBar";
import CategoryTabs from "./CategoryTabs";
import GameGrid from "./GameGrid";
import TermsSection from "./TermsSection"; // NEW
import BottomNav from "./BottomNav";
import WelcomeModal from "./WelcomeModal";
import LobbyWidgets from "./LobbyWidgets";
import { isAuthenticated } from "@/lib/auth";

export default function HomeScreen() {
  const [category, setCategory] = useState("all");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const hasShown = sessionStorage.getItem("hasShownWelcomePopup");
      if (!hasShown) {
        setShowWelcome(true);
      }
    }
  }, []);

  const handleConfirmWelcome = () => {
    sessionStorage.setItem("hasShownWelcomePopup", "true");
    setShowWelcome(false);
  };

  return (
    <main className="club-app">
      <AppHeader />

      <PromoBanner />

      <AnnouncementBar />

      <div className="home-main-layout" style={{ display: "flex", gap: "12px", padding: "0 12px", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ width: "72px", flexShrink: 0, position: "sticky", top: "70px", zIndex: 10 }}>
          <CategoryTabs
            active={category}
            onChange={setCategory}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GameGrid category={category} />
        </div>
      </div>

      <LobbyWidgets />

      {/* Terms & Conditions Section */}
      <TermsSection />

      <BottomNav />

      {/* Floating Customer Service Button */}
      <Link
        href="/support"
        style={{
          position: "fixed",
          right: "16px",
          bottom: "74px",
          zIndex: 99,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "3px solid #d4af37",
          outline: "2px solid #ffffff",
          boxShadow: "0 4px 15px rgba(71, 129, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--theme-green)",
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(71, 129, 255, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(71, 129, 255, 0.1)";
        }}
        aria-label="Customer Service"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "26px", height: "26px" }}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          <path d="M21 12v3" />
        </svg>
      </Link>

      <WelcomeModal isOpen={showWelcome} onClose={handleConfirmWelcome} />
    </main>
  );
}