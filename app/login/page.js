"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthTopBar from "@/components/auth/AuthTopBar";
import PhoneInput from "@/components/auth/PhoneInput";
import PasswordInput from "@/components/auth/PasswordInput";
import { login as loginRequest } from "@/lib/authApi";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("phone");
  const [form, setForm] = useState({ mobile: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginRequest(form);
      saveAuth(response.data);
      router.push("/");
    } catch (err) {
      if (!err.response) {
        setError("Couldn't reach the server. Check your internet connection or wait 30 seconds and try again (the server may be waking up).");
      } else if (err.response.status >= 500) {
        setError("Server error. Please wait 30 seconds and try again. If it keeps happening, contact support.");
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <AuthTopBar />

      <div className="register-wrapper">
        

        <section className="premium-form-section">
          <div className="register-card">
            <div style={{ textAlign: "center", marginBottom: "32px", marginTop: "10px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--theme-text)", marginBottom: "8px", letterSpacing: "-0.5px" }}>Welcome Back</h1>
              <p style={{ fontSize: "15px", color: "#64748b", fontWeight: "500" }}>Login to your Lucky Nova account</p>
            </div>
            <div className="register-tabs">
              <button
                type="button"
                className={activeTab === "phone" ? "active" : ""}
                onClick={() => {
                  setActiveTab("phone");
                  setForm((prev) => ({ ...prev, mobile: "" }));
                }}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Phone
              </button>

              <button
                type="button"
                className={activeTab === "email" ? "active" : ""}
                onClick={() => {
                  setActiveTab("email");
                  setForm((prev) => ({ ...prev, mobile: "" }));
                }}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="premium-form">
              {activeTab === "phone" ? (
                <div className="premium-field">
                  <label htmlFor="mobile" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    Phone number
                  </label>
                  <PhoneInput value={form.mobile} onChange={handleChange} />
                </div>
              ) : (
                <div className="premium-field">
                  <label htmlFor="mobile" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email Address
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="email"
                    className="auth-input"
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              )}

              <div className="premium-field">
                <label htmlFor="password" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                />
              </div>

              <div className="premium-form-options" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "13px", marginTop: "-6px" }}>
                <label className="premium-check" style={{ margin: 0, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember password</span>
                </label>
                <Link href="/support?form=password" style={{ color: "var(--theme-gold-bright)", textDecoration: "none", fontWeight: 700 }}>
                  Forgot Password?
                </Link>
              </div>

              <button className="premium-register-btn" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </button>

              <Link href="/register" className="premium-login-btn">
                Don't have an account?
                <strong> Create Account</strong>
              </Link>
            </form>

            <div className="premium-form-footer" style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <Link 
                href="/support" 
                className="premium-login-btn"
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "8px",
                  border: "1px solid rgba(255, 215, 80, 0.2)",
                  color: "var(--theme-gold-bright)"
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Customer Service
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
