import { randomBytes, randomUUID } from "node:crypto";

const paymentCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createTagToken(): string {
  return randomBytes(24).toString("base64url");
}

export function createPaymentCode(): string {
  const bytes = randomBytes(8);
  let suffix = "";

  for (const byte of bytes) {
    suffix += paymentCodeAlphabet[byte % paymentCodeAlphabet.length];
  }

  return `CP${suffix}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
