/** Escapes a value for CSV: wraps in quotes and doubles internal quotes if it contains a comma, quote, or newline. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Builds a CSV string (with header row) from an array of objects. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; label: string }[]): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Parses `from`/`to` query params (YYYY-MM-DD) into a Prisma createdAt range filter, defaulting to the last 30 days. */
export function parseDateRange(searchParams: URLSearchParams) {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const gte = fromParam ? new Date(fromParam + "T00:00:00") : defaultFrom;
  const lte = toParam ? new Date(toParam + "T23:59:59.999") : now;

  return { gte, lte };
}
