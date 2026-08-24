import Link from "next/link";
import { CrownArt } from "@/components/icons/art";
import { ArtImg } from "@/components/ArtImg";
import { TrendingUp, Headphones, Gift } from "lucide-react";

const PERKS = [
  { icon: <TrendingUp className="w-5 h-5 text-violet" />, label: "Higher Limits" },
  { icon: <Headphones className="w-5 h-5 text-violet" />, label: "VIP Support" },
  { icon: <Gift className="w-5 h-5 text-violet" />, label: "Weekly Rewards" },
];

export function VipStrip() {
  return (
    <section className="rounded-2xl border border-violet/40 bg-gradient-to-r from-violet/15 via-violet/5 to-transparent p-6 flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="flex items-center gap-4 flex-1">
        <ArtImg name="vip-crown" className="h-14 w-auto object-contain" fallback={<CrownArt size={52} />} />
        <div>
          <h2 className="font-bold text-violet tracking-wide">VIP CLUB</h2>
          <p className="text-xs text-muted mt-0.5">Exclusive benefits &amp; cashback</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6">
        {PERKS.map((perk) => (
          <div key={perk.label} className="text-center">
            <div className="flex justify-center mb-0.5">{perk.icon}</div>
            <p className="text-[11px] text-muted mt-0.5">{perk.label}</p>
          </div>
        ))}
      </div>
      <Link
        href="/vip"
        className="shrink-0 rounded-full bg-gradient-to-r from-violet to-[#6d8df5] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)] hover:brightness-110"
      >
        View Benefits →
      </Link>
    </section>
  );
}
