"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChestArt, CoinArt, FiveDArt, GiftArt, K3Art } from "@/components/icons/art";
import { ArtImg } from "@/components/ArtImg";
import { Star, Sparkles, Handshake, PartyPopper } from "lucide-react";

export type CmsHeroSlide = {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  badge: string | null;
  highlight: string | null;
  emoji: string | null;
};

const SLIDES = [
  {
    id: "welcome",
    eyebrow: (
      <span className="flex items-center gap-1">
        <Star size={14} className="text-gold" /> WELCOME BONUS
      </span>
    ),
    title: (
      <>
        100% BONUS <span className="text-gold">UP&nbsp;TO&nbsp;10,000</span>
      </>
    ),
    subtitle: (
      <span className="flex items-center gap-1">
        Make your first deposit and start winning! <PartyPopper size={16} className="text-gold" />
      </span>
    ),
    cta: { label: "JOIN NOW →", href: "/wallet" },
    art: (
      <ArtImg
        name="hero-chest"
        className="h-48 sm:h-60 w-auto object-contain"
        fallback={
          <div className="relative">
            <ChestArt size={170} />
            <div className="absolute -top-4 -left-8 animate-bounce [animation-duration:2.6s]">
              <CoinArt size={40} />
            </div>
            <div className="absolute top-8 -right-6 animate-bounce [animation-duration:3.2s]">
              <CoinArt size={28} />
            </div>
          </div>
        }
      />
    ),
  },
  {
    id: "lottery",
    eyebrow: (
      <span className="flex items-center gap-1">
        <Sparkles size={14} className="text-blue-400" /> NEW GAMES
      </span>
    ),
    title: (
      <>
        K3 &amp; 5D <span className="text-gold">LOTTERY</span>
      </>
    ),
    subtitle: "New dice-sum and 5-digit draws, every minute.",
    cta: { label: "PLAY NOW →", href: "/games" },
    art: (
      <div className="relative">
        <K3Art size={150} />
        <div className="absolute -bottom-6 -right-10 opacity-90">
          <FiveDArt size={96} />
        </div>
      </div>
    ),
  },
  {
    id: "referral",
    eyebrow: (
      <span className="flex items-center gap-1">
        <Handshake size={14} className="text-green-400" /> REFER & EARN
      </span>
    ),
    title: (
      <>
        INVITE FRIENDS, <span className="text-gold">EARN COINS</span>
      </>
    ),
    subtitle: "Earn rewards for every qualified friend you bring.",
    cta: { label: "INVITE NOW →", href: "/referral" },
    art: (
      <div className="relative">
        <GiftArt size={150} />
        <div className="absolute -top-6 -right-6 animate-bounce [animation-duration:2.8s]">
          <CoinArt size={36} />
        </div>
      </div>
    ),
  },
];

function Dots({ count, index, onPick }: { count: number; index: number; onPick: (i: number) => void }) {
  return (
    <div className="mt-6 flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          aria-label={`Slide ${i + 1}`}
          onClick={() => onPick(i)}
          className={clsx(
            "h-2 rounded-full transition-all",
            i === index ? "w-5 bg-gold" : "w-2 bg-border hover:bg-muted"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Shows published HOMEPAGE_BANNER items from the CMS when any exist
 * (managed in /admin/cms: draft → publish → archive); otherwise falls
 * back to the built-in designed slides.
 */
export function HeroCarousel({ cmsSlides = [] }: { cmsSlides?: CmsHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = cmsSlides.length > 0 ? cmsSlides.length : SLIDES.length;

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(interval);
  }, [count]);

  if (cmsSlides.length > 0) {
    const slide = cmsSlides[index % cmsSlides.length];
    return (
      <section className="bg-hero-gradient border border-gold/25 rounded-2xl relative overflow-hidden min-h-[220px]">
        {slide.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          </>
        )}
        <div className="relative p-6 sm:p-8 max-w-md">
          {slide.badge && (
            <p className="inline-block rounded-full border border-gold/40 bg-black/30 px-3 py-1 text-xs font-semibold text-gold tracking-wide">
              {slide.emoji ? `${slide.emoji} ` : ""}
              {slide.badge}
            </p>
          )}
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
            {slide.title} {slide.highlight && <span className="text-gold">{slide.highlight}</span>}
          </h2>
          {slide.body && <p className="mt-2 text-sm text-foreground/80">{slide.body}</p>}
          {slide.linkUrl && (
            <a
              href={slide.linkUrl}
              className="mt-5 inline-block rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] shadow-lg shadow-gold/20 hover:brightness-105"
            >
              CHECK IT OUT →
            </a>
          )}
          <Dots count={cmsSlides.length} index={index % cmsSlides.length} onPick={setIndex} />
        </div>
      </section>
    );
  }

  const slide = SLIDES[index % SLIDES.length];

  return (
    <section className="bg-hero-gradient border border-gold/25 rounded-2xl p-6 sm:p-8 relative overflow-hidden min-h-[220px]">
      {/* glow blob behind the art */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
      <div className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 opacity-40 sm:opacity-100 pointer-events-none select-none">
        {slide.art}
      </div>

      <div className="relative max-w-[65%] sm:max-w-md">
        <p className="inline-block rounded-full border border-gold/40 bg-black/30 px-3 py-1 text-xs font-semibold text-gold tracking-wide">
          {slide.eyebrow}
        </p>
        <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">{slide.title}</h2>
        <p className="mt-2 text-sm text-muted">{slide.subtitle}</p>
        <Link
          href={slide.cta.href}
          className="mt-5 inline-block rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] shadow-lg shadow-gold/20 hover:brightness-105"
        >
          {slide.cta.label}
        </Link>
        <Dots count={SLIDES.length} index={index % SLIDES.length} onPick={setIndex} />
      </div>
    </section>
  );
}
