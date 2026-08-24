"use client";

import { useActionState } from "react";
import { createCmsContentAction, updateCmsContentAction } from "@/lib/actions/cms";
import type { AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ImageDropzone } from "@/components/admin/ImageDropzone";

const initialState: AdminActionState = {};

const TYPES = [
  { value: "HOMEPAGE_BANNER", label: "Homepage Banner" },
  { value: "POPUP", label: "Popup" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "PROMOTIONAL_CARD", label: "Promotional Card" },
];

function ContentFields({ defaults }: { defaults?: Partial<Record<string, string | number | null>> }) {
  return (
    <>
      {defaults?.type ? (
        <>
          <input type="hidden" name="type" value={defaults.type as string} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Type</span>
            <p className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 opacity-70">
              {TYPES.find((t) => t.value === defaults.type)?.label}
            </p>
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Type</span>
          <select
            name="type"
            defaultValue="HOMEPAGE_BANNER"
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <TextField label="Title" name="title" defaultValue={defaults?.title as string} required />
      <TextField label="Body (optional)" name="body" defaultValue={defaults?.body as string} />
      <ImageDropzone name="imageUrl" defaultValue={(defaults?.imageUrl as string) ?? ""} />
      <TextField label="Link URL (optional)" name="linkUrl" defaultValue={defaults?.linkUrl as string} />
      <TextField label="Sort order" name="sortOrder" type="number" defaultValue={defaults?.sortOrder ?? 0} />
      <TextField label="Start at (optional)" name="startAt" type="datetime-local" defaultValue={defaults?.startAt as string} />
      <TextField label="End at (optional)" name="endAt" type="datetime-local" defaultValue={defaults?.endAt as string} />
    </>
  );
}

export function CreateCmsForm() {
  const [state, formAction, pending] = useActionState(createCmsContentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <ContentFields />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}

export function EditCmsForm({
  id,
  defaults,
}: {
  id: string;
  defaults: Record<string, string | number | null>;
}) {
  const [state, formAction, pending] = useActionState(updateCmsContentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <input type="hidden" name="id" value={id} />
      <ContentFields defaults={defaults} />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
