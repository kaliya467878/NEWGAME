"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { register as registerRequest } from "@/lib/authApi";
import { saveAuth } from "@/lib/auth";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState("phone");
  const [form, setForm] = useState({ mobile: "", password: "", confirmPassword: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(true);

  useEffect(() => {
    const ref = searchParams?.get("ref") || searchParams?.get("r") || searchParams?.get("invite");
    if (ref) setForm(prev => ({ ...prev, inviteCode: ref.trim().toUpperCase() }));
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agree) return setError("Please agree to the Privacy Agreement.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const response = await registerRequest({
        name: `Player${form.mobile.slice(-4) || "01"}`,
        mobile: form.mobile,
        password: form.password,
        referralCode: form.inviteCode.trim().toUpperCase() || undefined 
      });
      saveAuth(response.data);
      router.push("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", maxWidth: "480px", margin: "0 auto", background: "#f8fafc", position: "relative" }}>
      {/* Curved Gradient Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)", 
        height: "260px", 
        padding: "20px 24px",
        borderBottomLeftRadius: "40px",
        borderBottomRightRadius: "40px",
        color: "white",
        boxShadow: "0 10px 20px rgba(59,130,246,0.15)"
      }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", color: "white" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </Link>
          <div style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "1px" }}>LUCKY NOVA</div>
          <div style={{ width: "36px" }}></div>
        </div>

        {/* Hero Text */}
        <div style={{ marginTop: "40px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 8px 0" }}>Register</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "15px" }}>Create your account to start playing</p>
        </div>
      </div>

      {/* Form Container */}
      <div style={{ 
        background: "#ffffff", 
        margin: "-50px 16px 20px 16px", 
        borderRadius: "24px", 
        padding: "28px 20px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        position: "relative",
        zIndex: 10
      }}>
        
        {/* Tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "12px", padding: "4px", marginBottom: "30px" }}>
          <button 
            type="button"
            onClick={() => { setActiveTab("phone"); setForm((prev) => ({ ...prev, mobile: "" })); }}
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: activeTab === "phone" ? "#ffffff" : "transparent", color: activeTab === "phone" ? "#3b82f6" : "#64748b", fontWeight: "700", fontSize: "14px", boxShadow: activeTab === "phone" ? "0 2px 8px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Phone Number
            </div>
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab("email"); setForm((prev) => ({ ...prev, mobile: "" })); }}
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: activeTab === "email" ? "#ffffff" : "transparent", color: activeTab === "email" ? "#3b82f6" : "#64748b", fontWeight: "700", fontSize: "14px", boxShadow: activeTab === "email" ? "0 2px 8px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </div>
          </button>
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Mobile/Email Input */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", padding: "8px 0", marginBottom: "24px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderBottomColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderBottomColor = "#e2e8f0"}>
            <div style={{ padding: "0 12px 0 4px", color: "#3b82f6" }}>
              {activeTab === "phone" ? 
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> 
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              }
            </div>
            
            {activeTab === "phone" && (
              <div style={{ display: "flex", alignItems: "center", fontWeight: "600", fontSize: "15px", color: "#1e293b", paddingRight: "12px", borderRight: "1px solid #e2e8f0", marginRight: "12px" }}>
                +91
              </div>
            )}
            
            <input 
              name="mobile"
              type={activeTab === "phone" ? "tel" : "email"}
              value={form.mobile}
              onChange={handleChange}
              placeholder={activeTab === "phone" ? "Phone number" : "Email address"}
              required
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "16px", color: "#1e293b", fontWeight: "500", padding: "10px 0" }}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", padding: "8px 0", marginBottom: "24px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderBottomColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderBottomColor = "#e2e8f0"}>
            <div style={{ padding: "0 12px 0 4px", color: "#3b82f6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input 
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Set password"
              required
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "16px", color: "#1e293b", fontWeight: "500", padding: "10px 0" }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: "transparent", border: "none", padding: "0 4px", color: showPassword ? "#3b82f6" : "#cbd5e1", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>

          {/* Confirm Password Input */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", padding: "8px 0", marginBottom: "24px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderBottomColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderBottomColor = "#e2e8f0"}>
            <div style={{ padding: "0 12px 0 4px", color: "#3b82f6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <input 
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              required
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "16px", color: "#1e293b", fontWeight: "500", padding: "10px 0" }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ background: "transparent", border: "none", padding: "0 4px", color: showConfirm ? "#3b82f6" : "#cbd5e1", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>

          {/* Invite Code Input */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", padding: "8px 0", marginBottom: "32px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderBottomColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderBottomColor = "#e2e8f0"}>
            <div style={{ padding: "0 12px 0 4px", color: "#3b82f6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            </div>
            <input 
              name="inviteCode"
              type="text"
              value={form.inviteCode}
              onChange={handleChange}
              placeholder="Invite code (VIP777)"
              required
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "16px", color: "#1e293b", fontWeight: "500", padding: "10px 0", textTransform: "uppercase" }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontSize: "13px", color: "#64748b" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ accentColor: "#3b82f6", width: "16px", height: "16px", cursor: "pointer" }} />
            <span style={{ cursor: "pointer" }} onClick={() => setAgree(!agree)}>I agree to the <Link href="/privacy" style={{ color: "#3b82f6", fontWeight: "600", textDecoration: "none" }} onClick={e => e.stopPropagation()}>Privacy Agreement</Link></span>
          </div>

          <button type="submit" disabled={loading} style={{ 
            width: "100%", background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)", color: "white", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "700", boxShadow: "0 10px 25px rgba(59,130,246,0.3)", cursor: "pointer", opacity: loading ? 0.7 : 1
          }}>
            {loading ? "REGISTERING..." : "REGISTER"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href="/login" style={{ display: "inline-block", padding: "14px 32px", border: "1.5px solid #3b82f6", color: "#3b82f6", borderRadius: "12px", fontSize: "15px", fontWeight: "700", textDecoration: "none", width: "100%" }}>
              LOG IN INSTEAD
            </Link>
          </div>
        </form>
      </div>

    </main>
  );
}
