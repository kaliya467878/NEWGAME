const BUCKET = "cms-media";

function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, "");
  // Derive https://<ref>.supabase.co from the Postgres host (db.<ref>.supabase.co).
  const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  const match = dbUrl.match(/db\.([a-z0-9]+)\.supabase\.co/) ?? dbUrl.match(/postgres\.([a-z0-9]+):/);
  if (match) return `https://${match[1]}.supabase.co`;
  throw new Error("SUPABASE_URL is not set and could not be derived from the database URL");
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from Supabase dashboard → Project Settings → API keys."
    );
  }
  return key;
}

let bucketReady = false;

/** Creates the public bucket once per server lifetime; 409 (already exists) is fine. */
async function ensureBucket(baseUrl: string, key: string) {
  if (bucketReady) return;
  const res = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    // Supabase also reports duplicates as 400 "already exists".
    if (!text.includes("already exists")) {
      throw new Error(`Failed to create storage bucket: ${res.status} ${text}`);
    }
  }
  bucketReady = true;
}

/** Uploads an image buffer to Supabase Storage and returns its public URL. */
export async function uploadImage(data: ArrayBuffer, contentType: string, extension: string): Promise<string> {
  const baseUrl = getSupabaseUrl();
  const key = getServiceKey();
  await ensureBucket(baseUrl, key);

  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const res = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: data,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image upload failed: ${res.status} ${text}`);
  }

  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
