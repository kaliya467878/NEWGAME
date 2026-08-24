"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { uploadCmsImageAction } from "@/lib/actions/cms";

/**
 * Drag & drop image uploader. On success it writes the hosted URL into a
 * hidden `imageUrl` input, so the surrounding CMS form submits it exactly
 * like a pasted URL. Pasting a URL manually is still possible below.
 */
export function ImageDropzone({ name = "imageUrl", defaultValue }: { name?: string; defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadCmsImageAction(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setUrl(result.url);
      }
    } catch {
      setError("Upload failed — is the image under 4MB?");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">Image (optional)</span>
      <input type="hidden" name={name} value={url} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          "rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
          dragging ? "border-gold bg-gold/10" : "border-border hover:border-gold/50",
          uploading && "opacity-60 pointer-events-none"
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Uploaded preview" className="mx-auto max-h-36 rounded-lg object-cover" />
        ) : (
          <p className="text-muted py-4">
            {uploading ? "Uploading…" : dragging ? "Drop it!" : "Drag & drop an image here, or click to browse"}
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="…or paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs outline-none focus:border-gold/60"
        />
        {url && (
          <button type="button" onClick={() => setUrl("")} className="text-xs text-red hover:underline shrink-0">
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  );
}
