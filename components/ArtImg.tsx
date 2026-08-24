"use client";

import { createContext, useContext, useState } from "react";

const ArtOverridesContext = createContext<Record<string, string>>({});

/** Provides admin-uploaded art URLs (from /admin/game-assets) to all ArtImg below. */
export function ArtOverridesProvider({
  overrides,
  children,
}: {
  overrides: Record<string, string>;
  children: React.ReactNode;
}) {
  return <ArtOverridesContext.Provider value={overrides}>{children}</ArtOverridesContext.Provider>;
}

/**
 * Image resolution order:
 * 1. Admin-uploaded override (Setting `gameart:<name>`, managed in /admin/game-assets)
 * 2. Static file /images/art/{name}.png
 * 3. The SVG fallback
 */
export function ArtImg({
  name,
  fallback,
  className,
}: {
  name: string;
  fallback: React.ReactNode;
  className?: string;
}) {
  const overrides = useContext(ArtOverridesContext);
  const [failed, setFailed] = useState(false);

  const src = overrides[name] ?? `/images/art/${name}.png`;

  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={className ?? "object-contain"}
    />
  );
}
