"use client";

import PromoSection from "@/components/home/PromoSection";
import BottomNav from "@/components/home/BottomNav";

export default function PromoPage() {
  return (
    <main className="club-app" style={{ minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Top spacing to match design headers */}
      <div style={{ height: "16px" }} />
      <PromoSection />
      <BottomNav />
    </main>
  );
}
