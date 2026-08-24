import fs from "fs";
import path from "path";
import { requirePermission } from "@/lib/admin/permissions";
import { ART_SLOTS, getGameArtOverrides } from "@/lib/gameArt";
import { GameArtCard } from "./GameArtForms";

export default async function GameAssetsPage() {
  await requirePermission("cms.manage");
  const overrides = await getGameArtOverrides();

  const groups = Array.from(new Set(ART_SLOTS.map((s) => s.group)));

  // Static defaults that exist in public/images/art (shown when no override).
  const staticDir = path.join(process.cwd(), "public", "images", "art");
  const staticFiles = new Set(fs.existsSync(staticDir) ? fs.readdirSync(staticDir) : []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Game assets</h1>
        <p className="text-sm text-muted mt-1">
          Change the logo/artwork of any game or section. Uploads go live immediately; Reset returns to the
          built-in default.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group}>
          <h2 className="font-semibold mb-4">{group}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ART_SLOTS.filter((s) => s.group === group).map((slot) => {
              const overrideUrl = overrides[slot.key] ?? null;
              const staticUrl = staticFiles.has(`${slot.key}.png`) ? `/images/art/${slot.key}.png` : null;
              return (
                <GameArtCard
                  key={slot.key}
                  slot={slot.key}
                  label={slot.label}
                  recommendedSize={slot.recommendedSize}
                  currentUrl={overrideUrl ?? staticUrl}
                  hasOverride={overrideUrl !== null}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
