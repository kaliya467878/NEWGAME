"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";

type NavGroup = { group: string; items: { href: string; label: string }[] };

export function AdminSidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar drawer on route transition
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const prefix = pathname ? `/${pathname.split("/")[1]}` : "/admin";

  function isActive(href: string) {
    if (href === prefix) return pathname === prefix;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navContent = (
    <div className="flex flex-col gap-5 py-4">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-1.5 px-3">{g.group}</p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm transition",
                  isActive(item.href)
                    ? "bg-gold/10 border border-gold/40 text-gold font-medium"
                    : "text-muted border border-transparent hover:text-foreground hover:bg-surface"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-[11px] left-4 z-50 p-1.5 rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-3 transition"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Desktop Grouped Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-5 py-8 border-r border-border pr-4 sticky top-[57px] self-start max-h-[calc(100vh-57px)] overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <aside
        className={clsx(
          "lg:hidden fixed inset-y-0 left-0 w-64 bg-surface-2 border-r border-border p-5 pt-16 z-40 flex flex-col gap-5 overflow-y-auto transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
