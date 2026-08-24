"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavIcon from "./NavIcon";

const SIDE_NAV = [
  { href: "/", label: "Home", iconId: "home", match: "exact" },
  { href: "/referral", label: "Activity", iconId: "invite", match: "referral" },
  { href: "/wallet", label: "Deposit", iconId: "wallet", match: "wallet" },
  { href: "/account", label: "Account", iconId: "account", match: "account" },
];

const isActive = (pathname, match, href) => {
  if (match === "exact") return pathname === "/";
  if (match === "referral") return pathname.startsWith("/referral");
  if (match === "wallet") return pathname.startsWith("/wallet");
  if (match === "account") return pathname.startsWith("/account");
  return pathname.startsWith(href);
};

export default function BottomNav() {
  const pathname = usePathname();
  const [promoActive, setPromoActive] = useState(false);

  useEffect(() => {
    setPromoActive(pathname === "/promo" || pathname.startsWith("/promo"));
  }, [pathname]);

  return (
    <nav className="club-bottom-nav">
      {SIDE_NAV.slice(0, 2).map((item) => {
        const active = isActive(pathname, item.match, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`club-nav-item ${active ? "active" : ""}`}
          >
            <span className="club-nav-icon">
              <NavIcon id={item.iconId} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className={`club-nav-item promo ${promoActive ? "active" : ""}`}>
        <Link href="/promo" className="club-nav-promo-btn-goa" aria-label="Promotions">
          <div className="goa-promo-dial">
            <span className="goa-promo-go">GO</span>
          </div>
        </Link>
        <span className="goa-promo-text">Promotion</span>
      </div>

      {SIDE_NAV.slice(2).map((item) => {
        const active = isActive(pathname, item.match, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`club-nav-item ${active ? "active" : ""}`}
          >
            <span className="club-nav-icon">
              <NavIcon id={item.iconId} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
