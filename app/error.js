"use client";

// Route-level error boundary. Without this, any client-side exception in a page
// (e.g. a game screen) bubbles to Next's stark default "This page couldn't load"
// full-screen error. This shows a recoverable card with a working retry instead.

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({ error, reset }) {
  useEffect(() => {
    // Surface the real cause in the console / monitoring for diagnosis.
    console.error("App route error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        color: "var(--theme-text)",
        textAlign: "center" }}
    >
      <div style={{ maxWidth: 360, width: "100%" }}>
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "0 0 20px" }}>
          This page hit an error. Try again, or head back home.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              color: "#1a1a1a" }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-text)" }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
