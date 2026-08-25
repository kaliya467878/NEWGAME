"use client";

import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AuthTopBar() {
  return (
    <div className="auth-topbar">
      <Link href="/" className="auth-back" aria-label="Go back" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F5F9", borderRadius: "12px", width: "40px", height: "40px", color: "var(--theme-text)" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </Link>
      <div className="auth-topbar-logo">
        <BrandLogo href="/" size="sm" />
      </div>
      <div style={{ width: "40px" }} aria-hidden="true" />
    </div>
  );
}
