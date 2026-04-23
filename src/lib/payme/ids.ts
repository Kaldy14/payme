import { randomBytes, randomUUID } from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createTagToken(): string {
  return randomBytes(24).toString("base64url");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
