import { env } from "@/lib/env";

const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCzk(minor: number): string {
  return czkFormatter.format(minor / 100);
}

export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map((v) => Number(v));
  if (!y || !m) return monthKey;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
    timeZone: env.PAYME_OFFICE_TIMEZONE,
  }).format(date);
}

export function currentMonthKey(): string {
  const now = new Date();
  const zone = env.PAYME_OFFICE_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: env.PAYME_OFFICE_TIMEZONE,
  }).format(date);
}

export function formatShortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "short",
    timeZone: env.PAYME_OFFICE_TIMEZONE,
  }).format(date);
}
