export function formatPeriodDisplay(periodId: string | number | bigint | null | undefined): string {
  if (!periodId) return "—";
  return String(periodId);
}
