export function formatAmount(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}
