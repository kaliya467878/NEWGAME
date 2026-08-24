"use client";

import { useActionState, useRef, useState } from "react";
import clsx from "clsx";
import { saveGameArtAction, resetGameArtAction } from "@/lib/actions/gameAdmin";
import type { AdminActionState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export function GameArtCard({
  slot,
  label,
  recommendedSize,
  currentUrl,
  hasOverride,
}: {
  slot: string;
  label: string;
  recommendedSize: string;
  currentUrl: string | null;
  hasOverride: boolean;
}) {
  const [saveState, saveAction, saving] = useActionState(saveGameArtAction, initialState);
  const [resetState, resetAction, resetting] = useActionState(resetGameArtAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const shown = preview ?? currentUrl;

  function onPick(file: File | undefined | null) {
    if (!file || !fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files;
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="card-surface rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{label}</p>
        {hasOverride && (
          <span className="text-[10px] font-semibold text-gold border border-gold/40 bg-gold/10 rounded-full px-2 py-0.5">
            CUSTOM
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted -mt-1">📐 {recommendedSize}</p>

      <form ref={formRef} action={saveAction} className="flex flex-col gap-2">
        <input type="hidden" name="slot" value={slot} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files?.[0]); }}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "h-28 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden bg-surface-2 transition",
            dragging ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"
          )}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={label} className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <span className="text-xs text-muted px-3 text-center">Default art · drag image here or click</span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button type="submit" disabled={saving} className="!py-1.5 text-xs">
          {saving ? "Uploading…" : "Save"}
        </Button>
      </form>

      {hasOverride && (
        <form action={resetAction}>
          <input type="hidden" name="slot" value={slot} />
          <Button type="submit" variant="secondary" disabled={resetting} className="w-full !py-1.5 text-xs">
            {resetting ? "…" : "Reset to default"}
          </Button>
        </form>
      )}

      {(saveState.error || resetState.error) && (
        <p className="text-xs text-red">{saveState.error ?? resetState.error}</p>
      )}
      {(saveState.success || resetState.success) && (
        <p className="text-xs text-green">{saveState.success ?? resetState.success}</p>
      )}
    </div>
  );
}
