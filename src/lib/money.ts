const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCzk(minor: number): string {
  return czkFormatter.format(minor / 100);
}
