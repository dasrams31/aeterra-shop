export function formatPrice(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}
