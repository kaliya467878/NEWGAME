"use client";

import { useState } from "react";
import clsx from "clsx";
import { SlideRow, AddSlideButton, type SlideDto } from "./PromoBannerForms";

export function SlideTabs({ carousel, cards }: { carousel: SlideDto[]; cards: SlideDto[] }) {
  const [tab, setTab] = useState<"HOMEPAGE_BANNER" | "PROMOTIONAL_CARD">("HOMEPAGE_BANNER");
  const list = tab === "HOMEPAGE_BANNER" ? carousel : cards;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("HOMEPAGE_BANNER")}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm border font-medium",
            tab === "HOMEPAGE_BANNER" ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
          )}
        >
          Carousel <span className="ml-1 text-xs opacity-70">{carousel.length}</span>
        </button>
        <button
          onClick={() => setTab("PROMOTIONAL_CARD")}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm border font-medium",
            tab === "PROMOTIONAL_CARD" ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
          )}
        >
          Promo cards <span className="ml-1 text-xs opacity-70">{cards.length}</span>
        </button>
        <p className="text-xs text-muted ml-2">
          {tab === "HOMEPAGE_BANNER" ? "Rotating hero banner on home" : "Promotion cards on home"}
        </p>
        <div className="ml-auto">
          <AddSlideButton type={tab} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {list.length === 0 && <p className="text-sm text-muted">No slides yet.</p>}
        {list.map((s, i) => (
          <SlideRow key={s.id} index={i + 1} slide={s} />
        ))}
      </div>
    </div>
  );
}
