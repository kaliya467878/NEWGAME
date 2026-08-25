"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "./NavIcon";

const SIDE_NAV = [
  { href: "/", label: "Home", iconId: "home", match: "exact" },
  { href: "/activity", label: "Activity", iconId: "activity", match: "activity" },
  { href: "/customer", label: "Customer", iconId: "customer", match: "customer" },
  { href: "/team", label: "Team", iconId: "team", match: "team" },
  { href: "/account", label: "Mine", iconId: "account", match: "account" },
];

const isActive = (pathname, match, href) => {
  if (match === "exact") return pathname === "/";
  return pathname.startsWith(href);
};

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="club-bottom-nav">
      {SIDE_NAV.map((item) => {
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
