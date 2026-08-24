import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/permissions";
import { SlideTabs } from "./SlideTabs";
import type { SlideDto } from "./PromoBannerForms";

export default async function PromoBannersPage() {
  await requirePermission("cms.manage");

  const [carouselRows, cardRows] = await Promise.all([
    prisma.cmsContent.findMany({
      where: { type: "HOMEPAGE_BANNER" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.cmsContent.findMany({
      where: { type: "PROMOTIONAL_CARD" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const carousel = carouselRows as SlideDto[];
  const cards = cardRows as SlideDto[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Promo banners</h1>
        <p className="text-sm text-muted mt-1">Hero carousel and promotion cards on the player home screen.</p>
      </div>

      <SlideTabs carousel={carousel} cards={cards} />
    </div>
  );
}
