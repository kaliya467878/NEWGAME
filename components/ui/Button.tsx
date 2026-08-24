import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-gold-gradient text-[var(--theme-text)] font-semibold hover:brightness-105",
  secondary: "bg-surface-2 text-foreground border border-border hover:border-gold/50",
  ghost: "bg-transparent text-muted hover:text-foreground",
  danger: "bg-red text-[var(--theme-text)] font-semibold hover:brightness-110",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
