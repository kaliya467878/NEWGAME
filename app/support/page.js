"use client";

import Link from "next/link";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

function SupportContent() {
  const searchParams = useSearchParams();
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [proofImage, setProofImage] = useState(null);
  const [showManualBankName, setShowManualBankName] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-select form from query parameters (e.g. ?form=password)
  useEffect(() => {
    const formParam = searchParams.get("form");
    if (formParam) {
      setSelectedForm(formParam);
    }
  }, [searchParams]);

  // Form states
  const [formData, setFormData] = useState({
    utr: "",
    receiverUpi: "",
    orderNumber: "",
    orderAmount: "",
    pdfPassword: "",
    ifscCode: "",
    bankNumber: "",
    newPassword: "",
    oldPassword: "",
    changeReason: "",
    phoneOrEmail: "",
    verificationCode: "",
    bankName: "",
    accountHolder: "",
    usdtAddress: "",
    oldUpiId: "",
    oldUpiName: "",
    newUpiId: "",
    newUpiName: "",
    manualBankName: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerOtp = () => {
    if (!formData.phoneOrEmail) {
      alert("Please enter your registered phone number or email.");
      return;
    }
    setOtpSent(true);
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getFormTitle = (formType) => {
    const type = formType || selectedForm;
    switch (type) {
      case "deposit": return "Deposit Not Received";
      case "withdrawal": return "Withdrawal Problem";
      case "ifsc": return "IFSC Modification";
      case "password": return "Change ID Login Password";
      case "bankname": return "Change Bank Name";
      case "bankinfo": return "Modify Bank Information";
      case "modifyupi": return "Modify UPI";
      case "addusdt": return "Add USDT Address";
      case "changeusdt": return "Change USDT Address";
      default: return "Self Service Center";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Call the backend API to record the issue (auth is optional, so guests can submit too)
      await api.post("/users/me/feedback", {
        formTitle: getFormTitle(),
        data: {
          ...formData,
          proofImage: proofImage || undefined }
      });

      setSuccessMessage("Your self-service request has been submitted successfully! Our support team will review and process it within 24 hours.");
      setTimeout(() => {
        setSuccessMessage("");
        setSelectedForm(null);
        // Clear form
        setFormData({
          utr: "",
          receiverUpi: "",
          orderNumber: "",
          orderAmount: "",
          pdfPassword: "",
          ifscCode: "",
          bankNumber: "",
          newPassword: "",
          oldPassword: "",
          changeReason: "",
          phoneOrEmail: "",
          verificationCode: "",
          bankName: "",
          accountHolder: "",
          usdtAddress: "",
          oldUpiId: "",
          oldUpiName: "",
          newUpiId: "",
          newUpiName: "",
          manualBankName: "" });
        setProofImage(null);
        setOtpSent(false);
      }, 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (selectedForm) {
      case "deposit":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>UTR number<span className="req">*</span></label>
              <input
                type="text"
                name="utr"
                value={formData.utr}
                onChange={handleChange}
                placeholder="Please enter UTR"
                required
              />
            </div>

            <div className="form-group">
              <label>Receiver UPI ID<span className="req">*</span></label>
              <input
                type="text"
                name="receiverUpi"
                value={formData.receiverUpi}
                onChange={handleChange}
                placeholder="Please enter content"
                required
              />
            </div>

            <div className="form-group">
              <label>Order Number<span className="req">*</span></label>
              <input
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="Please enter Order Number"
                required
              />
            </div>

            <div className="form-group">
              <label>Order Amount<span className="req">*</span></label>
              <input
                type="number"
                name="orderAmount"
                value={formData.orderAmount}
                onChange={handleChange}
                placeholder="Please enter Order Amount"
                required
              />
            </div>

            <div className="form-group">
              <label>Provide PDF Password</label>
              <input
                type="text"
                name="pdfPassword"
                value={formData.pdfPassword}
                onChange={handleChange}
                placeholder="Please enter content"
              />
            </div>

            <div className="form-group">
              <label>Deposit proof receipt detail<span className="req">*</span></label>
              <div 
                className="upload-container" 
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundImage: proofImage ? `url(${proofImage})` : 'none' }}
              >
                {!proofImage && (
                  <>
                    <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="2" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>photo</span>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
                required={!proofImage}
              />
              <p className="upload-guideline">
                <strong>Image Upload Guidelines</strong><br />
                Please ensure the uploaded image clearly shows the UTR/UPI number. Uploading unrelated or inappropriate images may lead to failed requests.
              </p>
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "withdrawal":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Withdrawal Order Number<span className="req">*</span></label>
              <input
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="Please enter Order Number"
                required
              />
            </div>

            <div className="form-group">
              <label>Withdrawal Amount<span className="req">*</span></label>
              <input
                type="number"
                name="orderAmount"
                value={formData.orderAmount}
                onChange={handleChange}
                placeholder="Please enter Amount"
                required
              />
            </div>

            <div className="form-group">
              <label>Bank/Wallet Account Number<span className="req">*</span></label>
              <input
                type="text"
                name="bankNumber"
                value={formData.bankNumber}
                onChange={handleChange}
                placeholder="Please enter Account Number"
                required
              />
            </div>

            <div className="form-group">
              <label>Issue Description<span className="req">*</span></label>
              <textarea
                name="pdfPassword"
                value={formData.pdfPassword}
                onChange={handleChange}
                placeholder="Please describe the issue in detail"
                style={{ width: "100%", height: "100px", padding: "12px", border: "1px solid var(--theme-border)", color: "var(--theme-text)", borderRadius: "8px", outline: "none", fontSize: "14px" }}
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "ifsc":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Correct IFSC Code<span className="req">*</span></label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="Please enter IFSC"
                required
              />
            </div>

            <div className="form-group">
              <label>Bank number<span className="req">*</span></label>
              <input
                type="text"
                name="bankNumber"
                value={formData.bankNumber}
                onChange={handleChange}
                placeholder="Please enter Bank Card Number"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Registered ID (Phone/Email)<span className="req">*</span></label>
              <input
                type="text"
                name="phoneOrEmail"
                value={formData.phoneOrEmail}
                onChange={handleChange}
                placeholder="Please enter your registered phone or email"
                required
              />
            </div>

            <div className="form-group">
              <label>Old Password (if you have)</label>
              <input
                type="text"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="Please enter old password (optional)"
              />
            </div>

            <div className="form-group">
              <label>New Password<span className="req">*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Please enter a new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", color: "#94a3b8", cursor: "pointer", outline: "none" }}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Changing Password<span className="req">*</span></label>
              <textarea
                name="changeReason"
                value={formData.changeReason}
                onChange={handleChange}
                placeholder="Why are you changing your password?"
                style={{ width: "100%", height: "80px", padding: "12px", border: "1px solid var(--theme-border)", color: "var(--theme-text)", borderRadius: "8px", outline: "none", fontSize: "14px" }}
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "bankname":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Correct bank name<span className="req">*</span></label>
              <select
                name="bankName"
                value={formData.bankName}
                onChange={(e) => {
                  handleChange(e);
                  if (e.target.value === "OTHER") {
                    setShowManualBankName(true);
                  } else {
                    setShowManualBankName(false);
                    setFormData(prev => ({ ...prev, manualBankName: "" }));
                  }
                }}
                required
                style={{ width: "100%", padding: "12px", border: "1px solid var(--theme-border)", color: "var(--theme-text)", borderRadius: "8px", outline: "none", fontSize: "14px", height: "48px" }}
              >
                <option value="" >Please select a bank card name</option>
                <option value="SBI" >State Bank of India (SBI)</option>
                <option value="HDFC" >HDFC Bank</option>
                <option value="ICICI" >ICICI Bank</option>
                <option value="AXIS" >Axis Bank</option>
                <option value="PNB" >Punjab National Bank (PNB)</option>
                <option value="BOB" >Bank of Baroda (BOB)</option>
                <option value="KOTAK" >Kotak Mahindra Bank</option>
                <option value="CANARA" >Canara Bank</option>
                <option value="UNION" >Union Bank of India</option>
                <option value="INDUSIND" >IndusInd Bank</option>
                <option value="YES" >YES Bank</option>
                <option value="OTHER" >Other (Enter Manually)</option>
              </select>
            </div>

            {showManualBankName && (
              <div className="form-group animate-fadein">
                <label>Enter bank name manually<span className="req">*</span></label>
                <input
                  type="text"
                  name="manualBankName"
                  value={formData.manualBankName}
                  onChange={handleChange}
                  placeholder="Please enter bank name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Bank number<span className="req">*</span></label>
              <input
                type="text"
                name="bankNumber"
                value={formData.bankNumber}
                onChange={handleChange}
                placeholder="Please enter Bank Card Number"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "bankinfo":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Bank Name<span className="req">*</span></label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="Enter bank name"
                required
              />
            </div>

            <div className="form-group">
              <label>Bank Account Holder Name<span className="req">*</span></label>
              <input
                type="text"
                name="accountHolder"
                value={formData.accountHolder}
                onChange={handleChange}
                placeholder="Enter account holder name"
                required
              />
            </div>

            <div className="form-group">
              <label>Bank Card Number<span className="req">*</span></label>
              <input
                type="text"
                name="bankNumber"
                value={formData.bankNumber}
                onChange={handleChange}
                placeholder="Enter bank card number"
                required
              />
            </div>

            <div className="form-group">
              <label>IFSC Code<span className="req">*</span></label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="Enter IFSC code"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "changeusdt":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Registered Phone/Email<span className="req">*</span></label>
              <input
                type="text"
                name="phoneOrEmail"
                value={formData.phoneOrEmail}
                onChange={handleChange}
                placeholder="Please enter your registered phone or email"
                required
              />
            </div>

            <div className="form-group">
              <label>New USDT Address (TRC20)<span className="req">*</span></label>
              <input
                type="text"
                name="usdtAddress"
                value={formData.usdtAddress}
                onChange={handleChange}
                placeholder="Enter new USDT TRC20 address"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "modifyupi":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Old UPI ID<span className="req">*</span></label>
              <input
                type="text"
                name="oldUpiId"
                value={formData.oldUpiId}
                onChange={handleChange}
                placeholder="Please enter content"
                required
              />
            </div>

            <div className="form-group">
              <label>Old UPI Name<span className="req">*</span></label>
              <input
                type="text"
                name="oldUpiName"
                value={formData.oldUpiName}
                onChange={handleChange}
                placeholder="Please enter content"
                required
              />
            </div>

            <div className="form-group">
              <label>New UPI ID<span className="req">*</span></label>
              <input
                type="text"
                name="newUpiId"
                value={formData.newUpiId}
                onChange={handleChange}
                placeholder="Please enter content"
                required
              />
            </div>

            <div className="form-group">
              <label>New UPI Name<span className="req">*</span></label>
              <input
                type="text"
                name="newUpiName"
                value={formData.newUpiName}
                onChange={handleChange}
                placeholder="Please enter content"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      case "addusdt":
        return (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>USDT TRC20 Wallet Address<span className="req">*</span></label>
              <input
                type="text"
                name="usdtAddress"
                value={formData.usdtAddress}
                onChange={handleChange}
                placeholder="Please enter USDT Address"
                required
              />
            </div>

            <div className="form-group">
              <label>Account Holder name<span className="req">*</span></label>
              <input
                type="text"
                name="accountHolder"
                value={formData.accountHolder}
                onChange={handleChange}
                placeholder="Please enter Account Holder name"
                required
              />
            </div>

            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? "Submitting..." : "Confirm"}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <main className="support-page-container">
      <header className="support-header">
        {selectedForm ? (
          <button onClick={() => setSelectedForm(null)} className="support-back">‹</button>
        ) : (
          <Link href="/login" className="support-back">‹</Link>
        )}
        <h1>{getFormTitle()}</h1>
        {selectedForm ? (
          <div className="support-help-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        ) : (
          <div className="support-lang">
            <span className="flag-icon">🇺🇸</span>
            <span>EN</span>
          </div>
        )}
      </header>

      {successMessage && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {!selectedForm ? (
        <div className="support-content">
          {/* Banner */}
          <div className="support-banner" />

          <div className="self-service-section">
            <h2>Self Service</h2>

            <div className="service-list">
              <div className="service-item" onClick={() => setSelectedForm("deposit")}>
                <div className="item-left">
                  <div className="item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  </div>
                  <span>Deposit Not Received</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("withdrawal")}>
                <div className="item-left">
                  <div className="item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <span>Withdrawal Problem</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("ifsc")}>
                <div className="item-left">
                  <div className="item-icon text-icon">
                    <span>IFSC</span>
                  </div>
                  <span>IFSC Modification</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("password")}>
                <div className="item-left">
                  <div className="item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <circle cx="8.5" cy="8.5" r="4.5" />
                      <line x1="12.2" y1="12.2" x2="22" y2="22" />
                      <line x1="17" y1="13" x2="21" y2="17" />
                    </svg>
                  </div>
                  <span>Change ID Login Password</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("bankname")}>
                <div className="item-left">
                  <div className="item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M3 22h18" />
                      <path d="M6 18v-7" />
                      <path d="M10 18v-7" />
                      <path d="M14 18v-7" />
                      <path d="M18 18v-7" />
                      <path d="M4 11h16L12 3z" />
                    </svg>
                  </div>
                  <span>Change Bank Name</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("bankinfo")}>
                <div className="item-left">
                  <div className="item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span>Modify Bank Information</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("modifyupi")}>
                <div className="item-left">
                  <div className="item-icon text-icon" style={{ color: "var(--theme-green)", border: "1px solid rgba(71, 129, 255, 0.1)" }}>
                    <span style={{ fontSize: "10px", fontWeight: "900" }}>UPI</span>
                  </div>
                  <span>Modify UPI</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("addusdt")}>
                <div className="item-left">
                  <div className="item-icon" style={{ color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: "28px", height: "28px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "900" }}>₮</span>
                  </div>
                  <span>Add USDT Address</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <div className="service-item" onClick={() => setSelectedForm("changeusdt")}>
                <div className="item-left">
                  <div className="item-icon" style={{ color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: "28px", height: "28px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "900" }}>₮</span>
                  </div>
                  <span>Change USDT Address</span>
                </div>
                <span className="arrow">›</span>
              </div>

              <a href="https://t.me/luckynovaofficial" target="_blank" rel="noopener noreferrer" className="service-item" style={{ textDecoration: "none" }}>
                <div className="item-left">
                  <div className="item-icon" style={{ color: "#0088cc", border: "1px solid rgba(0, 136, 204, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: "28px", height: "28px" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.73 7.59-3.25 3.61-1.48 4.36-1.74 4.85-1.75.11 0 .35.03.5.16.13.11.17.26.18.38.01.08.01.23 0 .32z"/>
                    </svg>
                  </div>
                  <span>【LuckyNova】Official Channel</span>
                </div>
                <span className="arrow">›</span>
              </a>

              <a href="https://www.luckynova11.site" target="_blank" rel="noopener noreferrer" className="service-item" style={{ textDecoration: "none" }}>
                <div className="item-left">
                  <div className="item-icon" style={{ color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", width: "28px", height: "28px" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <span>Check LuckyNova Official Website</span>
                </div>
                <span className="arrow">›</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-content-wrapper">
          {renderForm()}
        </div>
      )}

      <style jsx global>{`
        .support-page-container {
          background-color: var(--theme-bg-card);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--theme-text);
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
          position: relative;
        }

        .support-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--theme-bg-card);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: sticky;
          top: 0;
          z-index: 10;
          height: 56px;
        }

        .support-back {
          font-size: 28px;
          color: #d4af37;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 10px;
          text-decoration: none;
          line-height: 1;
        }

        .support-header h1 {
          font-size: 16px;
          font-weight: 800;
          color: var(--theme-text);
          margin: 0;
          flex: 1;
          text-align: center;
        }

        .support-lang {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #d4af37;
        }

        .support-help-icon {
          color: #d4af37;
          cursor: pointer;
        }

        .support-banner {
          display: flex;
          background-color: var(--theme-bg-card);
          background-image: url('/images/customer-service-banner.jpg');
          background-size: cover;
          background-position: right center;
          border-bottom: 1px solid rgba(71, 129, 255, 0.1);
          color: var(--theme-text);
          padding: 20px;
          overflow: hidden;
          position: relative;
          height: 160px;
        }

        .banner-left {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          z-index: 2;
        }

        .banner-left h2 {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.4;
          margin: 0 0 12px 0;
          color: #f4d77d;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .self-service-section {
          padding: 16px;
        }

        .self-service-section h2 {
          font-size: 14px;
          font-weight: 800;
          color: #a9a9a9;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .service-list {
          background: var(--theme-bg-card);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .service-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.2s;
        }

        .service-item:last-child {
          border-bottom: none;
        }

        .service-item:active {
          background: rgba(71, 129, 255, 0.1);
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .item-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(71, 129, 255, 0.1);
          border: 1px solid rgba(71, 129, 255, 0.1);
          color: #d4af37;
        }

        .item-icon.text-icon {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .service-item span {
          font-size: 14px;
          font-weight: 600;
          color: #ececec;
        }

        .arrow {
          font-size: 20px;
          color: #d4af37;
        }

        /* Form styling */
        .form-content-wrapper {
          padding: 16px;
        }

        .support-form {
          background: var(--theme-bg-card);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #a9a9a9;
          margin-bottom: 8px;
        }

        .form-group label .req {
          color: #ef4444;
          margin-left: 2px;
        }

        .form-group input {
          width: 100%;
          height: 48px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          background: var(--theme-bg-card);
          color: var(--theme-text);
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          border-color: #d4af37;
        }

        .otp-btn {
          height: 48px;
          padding: 0 16px;
          background: var(--theme-bg-card);
          color: #d4af37;
          border: 1px solid rgba(71, 129, 255, 0.1);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .otp-btn:disabled {
          color: #6e6e6e;
          border-color: rgba(255, 255, 255, 0.05);
          cursor: not-allowed;
        }

        .upload-container {
          width: 80px;
          height: 80px;
          border: 1px dashed rgba(71, 129, 255, 0.1);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #d4af37;
          cursor: pointer;
          background-size: cover;
          background-position: center;
          font-size: 12px;
          font-weight: 600;
          background-color: var(--theme-bg-card);
        }

        .upload-container span {
          margin-top: 4px;
        }

        .upload-guideline {
          font-size: 11px;
          color: #f87171;
          line-height: 1.5;
          margin-top: 10px;
        }

        .confirm-btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #f4d77d 0%, #d4af37 100%);
          color: var(--theme-text);
          border: none;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 4px 12px rgba(71, 129, 255, 0.1);
          transition: transform 0.1s;
        }

        .confirm-btn:active {
          transform: scale(0.98);
        }

        /* Success Overlay */
        .success-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--theme-bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .success-modal {
          background: var(--theme-bg-card);
          border: 1px solid rgba(71, 129, 255, 0.1);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05), 0 0 30px rgba(71, 129, 255, 0.1);
          padding: 24px;
          border-radius: 16px;
          text-align: center;
          max-width: 320px;
          width: 80%;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .success-icon {
          width: 48px;
          height: 48px;
          background: rgba(46, 125, 50, 0.15);
          border: 1.5px solid #22c55e;
          color: #22c55e;
          font-size: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
        }

        .success-modal p {
          font-size: 14px;
          font-weight: 700;
          color: var(--theme-text);
          line-height: 1.6;
          margin: 0;
        }

        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--theme-green)" }}>
        Loading Support Center...
      </div>
    }>
      <SupportContent />
    </Suspense>
  );
}
