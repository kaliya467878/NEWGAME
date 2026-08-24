import { getActiveCmsContent } from "@/lib/cms/queries";
import { PopupModal } from "./PopupModal";

export async function HomepageBanners() {
  const banners = await getActiveCmsContent("HOMEPAGE_BANNER");
  if (banners.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 overflow-x-auto">
      <div className="flex gap-3">
        {banners.map((b) => (
          <a
            key={b.id}
            href={b.linkUrl ?? undefined}
            className="shrink-0 w-72 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent p-5"
          >
            {b.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.imageUrl} alt={b.title} className="w-full h-28 object-cover rounded-lg mb-3" />
            )}
            <p className="font-semibold">{b.title}</p>
            {b.body && <p className="text-sm text-muted mt-1">{b.body}</p>}
          </a>
        ))}
      </div>
    </section>
  );
}

export async function PublicAnnouncements() {
  const announcements = await getActiveCmsContent("ANNOUNCEMENT");
  if (announcements.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      {announcements.map((a) => (
        <div key={a.id} className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
          <p className="font-medium">{a.title}</p>
          {a.body && <p className="text-muted mt-0.5">{a.body}</p>}
        </div>
      ))}
    </section>
  );
}

export async function PromotionalCards() {
  const cards = await getActiveCmsContent("PROMOTIONAL_CARD");
  if (cards.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Promotions</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <a key={c.id} href={c.linkUrl ?? undefined} className="card-surface rounded-xl p-4 hover:border-gold/50 transition">
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt={c.title} className="w-full h-24 object-cover rounded-lg mb-2" />
            )}
            {c.badge && (
              <span className="inline-block text-[10px] font-semibold text-gold border border-gold/40 bg-gold/10 rounded-full px-2 py-0.5 mb-1.5">
                {c.badge}
              </span>
            )}
            <p className="font-medium">
              {c.emoji ? `${c.emoji} ` : ""}
              {c.title} {c.highlight && <span className="text-gold">{c.highlight}</span>}
            </p>
            {c.body && <p className="text-xs text-muted mt-1">{c.body}</p>}
          </a>
        ))}
      </div>
    </section>
  );
}

export async function PopupCms() {
  const popups = await getActiveCmsContent("POPUP");
  if (popups.length === 0) return null;
  const popup = popups[0];

  return <PopupModal id={popup.id} title={popup.title} body={popup.body} imageUrl={popup.imageUrl} linkUrl={popup.linkUrl} />;
}
