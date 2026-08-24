"use client";

import { InputHTMLAttributes, useState } from "react";
import clsx from "clsx";

export function TextField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <input
        className={clsx(
          "rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 text-foreground outline-none focus:border-gold/60 transition placeholder:text-muted/60",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function PasswordField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={clsx(
            "w-full rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 pr-11 text-foreground outline-none focus:border-gold/60 transition",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
          tabIndex={-1}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
