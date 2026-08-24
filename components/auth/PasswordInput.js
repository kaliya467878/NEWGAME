"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ id, name, value, onChange, placeholder, required = true, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-input-wrap">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="auth-input"
      />
      <button
        type="button"
        className="auth-eye"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {visible ? <EyeOff size={18} style={{ color: "rgba(255, 215, 80, 0.75)" }} /> : <Eye size={18} style={{ color: "rgba(255, 215, 80, 0.75)" }} />}
      </button>
    </div>
  );
}
