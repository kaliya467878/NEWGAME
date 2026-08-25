"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login as loginRequest } from "@/lib/authApi";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("phone");
  const [form, setForm] = useState({ mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        setError("Couldn't reach server.");
      } else {
        setError(err.response?.data?.message || "Login failed.");
      }
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
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", color: "white" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </Link>
          <div style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "1px" }}>LUCKY NOVA</div>
          <div style={{ width: "36px" }}></div>
        </div>

        {/* Hero Text */}
        <div style={{ marginTop: "40px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 8px 0" }}>Log in</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "15px" }}>Please log in to your account</p>
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
                +91 <svg style={{marginLeft: "4px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
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
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", padding: "8px 0", marginBottom: "32px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderBottomColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderBottomColor = "#e2e8f0"}>
            <div style={{ padding: "0 12px 0 4px", color: "#3b82f6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input 
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              required
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "16px", color: "#1e293b", fontWeight: "500", padding: "10px 0" }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: "transparent", border: "none", padding: "0 4px", color: showPassword ? "#3b82f6" : "#cbd5e1" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "#3b82f6", width: "16px", height: "16px" }} />
              Remember password
            </label>
            <Link href="/support" style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "600", textDecoration: "none" }}>Forgot Password?</Link>
          </div>

          <button type="submit" disabled={loading} style={{ 
            width: "100%", background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)", color: "white", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "700", boxShadow: "0 10px 25px rgba(59,130,246,0.3)", cursor: "pointer", opacity: loading ? 0.7 : 1
          }}>
            {loading ? "LOGGING IN..." : "LOG IN"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href="/register" style={{ display: "inline-block", padding: "14px 32px", border: "1.5px solid #3b82f6", color: "#3b82f6", borderRadius: "12px", fontSize: "15px", fontWeight: "700", textDecoration: "none", width: "100%" }}>
              REGISTER ACCOUNT
            </Link>
          </div>
        </form>
      </div>
      
      {/* Customer Service */}
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Link href="/support" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>
          Customer Service
        </Link>
      </div>

    </main>
  );
}
