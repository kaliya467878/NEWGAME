"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken, getUser, setUser } from "@/lib/auth";
import { getStoredAvatar, setStoredAvatar } from "@/lib/userPreferences";
import { getProfile, updateProfile } from "@/lib/userApi";

const AVATAR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [mobileMasked, setMobileMasked] = useState("");
  const [avatar, setAvatar] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      const profile = res.data;
      setName(profile.name || "");
      setMobileMasked(profile.mobileMasked || "");
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, ...profile });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load profile");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAvatar(getStoredAvatar() || "1");
    loadProfile();
  }, [router, loadProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateProfile({ name });
      setStoredAvatar(avatar);
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, name });
      }
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="account-page">
      <AccountSubHeader title="Profile" backHref="/account" />

      <form className="account-form" onSubmit={handleSubmit}>
        {error && <div className="account-form-error">{error}</div>}
        {success && <div className="account-form-success">{success}</div>}

        <section className="account-form-section">
          <label className="account-form-label">Avatar</label>
          <div className="account-avatar-grid">
            {AVATAR_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`account-avatar-option ${avatar === item ? "active" : ""}`}
                onClick={() => setAvatar(item)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "44px", padding: 0, overflow: "hidden", borderRadius: "10px" }}
              >
                {renderAvatarSvg(item)}
              </button>
            ))}
          </div>
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="account-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
        </section>

        <section className="account-form-section">
          <label className="account-form-label">Mobile</label>
          <input className="account-form-input" value={mobileMasked} disabled />
          <p className="account-form-hint">Mobile number cannot be changed here.</p>
        </section>

        <button type="submit" className="account-form-submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </main>
  );
}

function renderAvatarSvg(id) {
  switch (id) {
    case "1":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#FFE082"/>
          <circle cx="50" cy="40" r="22" fill="#4E342E"/>
          <path d="M20 90a30 30 0 0 1 60 0" fill="#5D4037"/>
          <rect x="35" y="35" width="30" height="8" rx="2" fill="#000"/>
          <circle cx="50" cy="45" r="3" fill="#FF8F00"/>
        </svg>
      );
    case "2":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#80CBC4"/>
          <circle cx="50" cy="38" r="20" fill="#D7CCC8"/>
          <path d="M25 90a25 25 0 0 1 50 0" fill="#00796B"/>
          <path d="M40 30c5-5 15-5 20 0" stroke="#37474F" strokeWidth="4" fill="none"/>
        </svg>
      );
    case "3":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#CE93D8"/>
          <circle cx="50" cy="42" r="22" fill="#FFE082"/>
          <path d="M22 88a28 28 0 0 1 56 0" fill="#7B1FA2"/>
          <circle cx="42" cy="42" r="2" fill="#333"/>
          <circle cx="58" cy="42" r="2" fill="#333"/>
          <path d="M45 50q5 4 10 0" stroke="#333" strokeWidth="2" fill="none"/>
        </svg>
      );
    case "4":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#FFCC80"/>
          <rect x="30" y="20" width="40" height="25" rx="10" fill="#E65100"/>
          <circle cx="50" cy="45" r="20" fill="#FFD54F"/>
          <path d="M24 92a26 26 0 0 1 52 0" fill="#BF360C"/>
        </svg>
      );
    case "5":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#90CAF9"/>
          <rect x="32" y="24" width="36" height="30" rx="6" fill="#37474F"/>
          <circle cx="42" cy="38" r="4" fill="#00E676"/>
          <circle cx="58" cy="38" r="4" fill="#00E676"/>
          <rect x="42" y="46" width="16" height="4" fill="#00E676"/>
          <path d="M25 90a25 25 0 0 1 50 0" fill="#1565C0"/>
        </svg>
      );
    case "6":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#F48FB1"/>
          <path d="M30 25c10-10 30-10 40 0 10 10 5 30 5 30H25s-5-20 5-30z" fill="#AD1457"/>
          <circle cx="50" cy="44" r="18" fill="#FFD54F"/>
          <path d="M26 88a24 24 0 0 1 48 0" fill="#C2185B"/>
        </svg>
      );
    case "7":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#A5D6A7"/>
          <circle cx="50" cy="36" r="18" fill="#F5CBA7"/>
          <path d="M36 44c0 10 8 16 14 16s14-6 14-16" fill="#5D4037"/>
          <path d="M26 90a24 24 0 0 1 48 0" fill="#2E7D32"/>
        </svg>
      );
    case "8":
      return (
        <svg viewBox="0 0 100 100" width="44" height="44">
          <circle cx="50" cy="50" r="50" fill="#B0BEC5"/>
          <circle cx="50" cy="44" r="20" fill="#FFE082"/>
          <path d="M35 24l5 8 10-8 10 8 5-8v12H35V24z" fill="#FFD54F"/>
          <path d="M24 90a26 26 0 0 1 52 0" fill="#37474F"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: "rgba(255,255,255,0.4)" }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}
