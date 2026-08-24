"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import {
  updateCmsContentAction,
  toggleCmsVisibilityAction,
  deleteCmsContentAction,
  addBlankSlideAction,
} from "@/lib/actions/cms";
import type { AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export type SlideDto = {
  id: string;
  type: "HOMEPAGE_BANNER" | "PROMOTIONAL_CARD";
  title: string;
  body: string | null;
  linkUrl: string | null;
  badge: string | null;
  highlight: string | null;
  emoji: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export function AddSlideButton({ type }: { type: SlideDto["type"] }) {
  return (
    <form action={addBlankSlideAction}>
      <input type="hidden" name="type" value={type} />
      <button className="rounded-lg border border-border px-4 py-2 text-sm hover:border-gold/50 hover:text-gold">
        + Add slide
      </button>
    </form>
  );
}

export function SlideRow({ index, slide }: { index: number; slide: SlideDto }) {
  const [expanded, setExpanded] = useState(false);
  const visible = slide.status === "PUBLISHED";

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="w-full flex items-center justify-between p-4">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-3 text-left flex-1 min-w-0">
          <span className="h-7 w-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs text-muted shrink-0">
            {index}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{slide.title}</p>
            <p className="text-xs text-muted truncate">
              {slide.badge && <span>{slide.badge}</span>}
              {slide.badge && slide.highlight ? " · " : ""}
              {slide.highlight && <span>{slide.highlight}</span>}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          <form action={toggleCmsVisibilityAction}>
            <input type="hidden" name="id" value={slide.id} />
            <input type="hidden" name="visible" value={(!visible).toString()} />
            <button
              type="submit"
              className={clsx(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                visible ? "border-green/40 text-green bg-green/10" : "border-border text-muted bg-surface-2"
              )}
            >
              {visible ? "VISIBLE" : "HIDDEN"}
            </button>
          </form>
          <button onClick={() => setExpanded((v) => !v)} className={clsx("text-muted transition-transform", expanded && "rotate-180")}>
            ▾
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-5">
          <SlideForm slide={slide} />
        </div>
      )}
    </div>
  );
}

function SlideForm({ slide }: { slide: SlideDto }) {
  const [state, formAction, pending] = useActionState(updateCmsContentAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={slide.id} />
        <input type="hidden" name="type" value={slide.type} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Badge" name="badge" defaultValue={slide.badge ?? ""} placeholder="UP TO ₹488" />
          <TextField label="Highlight" name="highlight" defaultValue={slide.highlight ?? ""} placeholder="₹488" />
        </div>
        <TextField label="Title" name="title" defaultValue={slide.title} required />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Emoji" name="emoji" defaultValue={slide.emoji ?? ""} placeholder="💰" />
          <TextField label="Link" name="linkUrl" defaultValue={slide.linkUrl ?? ""} placeholder="/wallet/deposit" />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Body (optional)</span>
          <textarea
            name="body"
            defaultValue={slide.body ?? ""}
            rows={2}
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60 resize-y"
          />
        </label>

        {state.error && <p className="text-sm text-red">{state.error}</p>}
        {state.success && <p className="text-sm text-green">{state.success}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>

      <form action={deleteCmsContentAction} className="self-start">
        <input type="hidden" name="id" value={slide.id} />
        <button type="submit" className="text-sm text-red hover:underline">
          Remove
        </button>
      </form>
    </div>
  );
}
