import { prisma } from "@/lib/prisma";

/**
 * Every image slot on the user site that admins can override from
 * /admin/game-assets. Overrides are stored in the Setting table as
 * `gameart:<key>` → image URL; when unset the site falls back to
 * /public/images/art/<key>.png, then to built-in SVG art.
 *
 * `recommendedSize` describes exactly how the slot is rendered on the site
 * (dimensions + fit behavior) so an admin knows what to crop the source
 * image to before uploading, for a pixel-perfect fit.
 */
export const ART_SLOTS = [
  { key: "game-wingo", label: "Wingo", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-k3", label: "K3", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-fived", label: "5D", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-crash", label: "Crash", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-mines", label: "Mines", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-dice", label: "Dice", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "game-wheel", label: "Lucky Wheel", group: "Game cards", recommendedSize: "480×270px (16:9) · fits inside, transparent or dark background" },
  { key: "cat-all", label: "All Games", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-popular", label: "Popular", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-lottery", label: "Lottery", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-crash", label: "Crash", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-mines", label: "Mines", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-dice", label: "Dice", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "cat-wheel", label: "Wheel", group: "Category circles", recommendedSize: "256×256px square · cropped to a circle, subject centered" },
  { key: "hero-chest", label: "Hero banner art (welcome slide)", group: "Other", recommendedSize: "800×600px · fits inside, transparent background, subject centered-right" },
  { key: "qa-people", label: "Quick action: Invite Friends", group: "Other", recommendedSize: "200×200px square · transparent background" },
  { key: "qa-gift", label: "Quick action: Daily Bonus", group: "Other", recommendedSize: "200×200px square · transparent background" },
  { key: "qa-wallet", label: "Quick action: Wallet", group: "Other", recommendedSize: "200×200px square · transparent background" },
  { key: "qa-crown", label: "Quick action: VIP Club", group: "Other", recommendedSize: "200×200px square · transparent background" },
  { key: "vip-crown", label: "VIP crown", group: "Other", recommendedSize: "300×300px square · transparent background" },
  { key: "refer-gift", label: "Sidebar refer gift", group: "Other", recommendedSize: "200×200px square · transparent background" },
  { key: "nav-promo", label: "Mobile nav promo button", group: "Other", recommendedSize: "200×200px square · cropped to a circle" },
  { key: "trophy", label: "Top Winners trophy", group: "Other", recommendedSize: "100×100px square · transparent background" },
] as const;

export function gameArtSettingKey(slot: string) {
  return `gameart:${slot}`;
}

/** Map of slot key → admin-uploaded URL, for slots that have an override. */
export async function getGameArtOverrides(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "gameart:" } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key.slice("gameart:".length)] = row.value;
  }
  return map;
}
