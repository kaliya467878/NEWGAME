"use client";

import { useEffect, useState } from "react";

export function PopupModal({
  id,
  title,
  body,
  imageUrl,
  linkUrl,
}: {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seenKey = `luckynova:popup:${id}`;
    if (!sessionStorage.getItem(seenKey)) {
      setVisible(true);
      sessionStorage.setItem(seenKey, "1");
    }
  }, [id]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="card-surface rounded-2xl p-6 max-w-sm w-full text-center">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="w-full h-32 object-cover rounded-lg mb-4" />
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
        {body && <p className="text-sm text-muted mt-2">{body}</p>}
        <div className="flex flex-col gap-2 mt-5">
          {linkUrl && (
            <a href={linkUrl} className="rounded-xl px-4 py-2.5 text-sm bg-gold-gradient text-[var(--theme-text)] font-semibold">
              Learn more
            </a>
          )}
          <button
            onClick={() => setVisible(false)}
            className="rounded-xl px-4 py-2.5 text-sm bg-surface-2 border border-border text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
