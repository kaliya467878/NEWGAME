import Link from "next/link";
import { PublicAnnouncements, PromotionalCards, PopupCms } from "@/components/cms/PublicCms";
import { getActiveCmsContent } from "@/lib/cms/queries";
import { GameCatalogGrid } from "@/components/GameCatalogGrid";
import { HeroCarousel } from "@/components/HeroCarousel";
import { VipStrip } from "@/components/VipStrip";
import { WinnersWidgets } from "@/components/WinnersWidgets";
import { CrownArt, GiftArt, PercentArt, PeopleArt } from "@/components/icons/art";
import { ArtImg } from "@/components/ArtImg";

const QUICK_ACTIONS = [
  { href: "/referral", label: "Invite Friends", sub: "Earn rewards", art: "qa-people", Art: PeopleArt },
  { href: "/rewards", label: "Daily Bonus", sub: "Claim now", art: "qa-gift", Art: GiftArt },
  { href: "/rewards", label: "Promotions", sub: "Explore offers", art: "qa-percent", Art: PercentArt },
  { href: "/vip", label: "VIP Club", sub: "Exclusive perks", art: "qa-crown", Art: CrownArt },
];

/**
 * The lobby feed shared by the public homepage ("/") and the signed-in
 * dashboard ("/dashboard") — same content either way, only the header and
 * whether protected links bounce to /login differ between the two.
 */
export async function HomeFeed() {
  const banners = await getActiveCmsContent("HOMEPAGE_BANNER");
  const heroSlides = banners.map((b) => ({
    id: b.id,
    title: b.title,
    body: b.body,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    badge: b.badge,
    highlight: b.highlight,
    emoji: b.emoji,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PopupCms />

      <HeroCarousel cmsSlides={heroSlides} />

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action, i) => (
          <Link
            key={`${action.href}-${i}`}
            href={action.href}
            className="card-surface rounded-xl p-4 flex flex-col items-center text-center gap-1.5 hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 transition"
          >
            <div className="h-10 flex items-center justify-center">
              <ArtImg name={action.art} className="max-h-full w-auto object-contain" fallback={<action.Art size={36} />} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
            <span className="text-[11px] text-muted">{action.sub}</span>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Games</h2>
          <Link href="/games" className="text-sm text-gold hover:underline">
            View All &rarr;
          </Link>
        </div>
        <GameCatalogGrid />
      </section>

      <VipStrip />

      <WinnersWidgets />

      <section className="rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gold">Refer &amp; Earn</h2>
          <p className="text-sm text-muted mt-1">Invite your friends and earn up to big rewards on every qualified signup.</p>
        </div>
        <Link
          href="/referral"
          className="shrink-0 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)] hover:brightness-110"
        >
          Invite Now →
        </Link>
      </section>

      <PublicAnnouncements />

      <PromotionalCards />
    </div>
  );
}
