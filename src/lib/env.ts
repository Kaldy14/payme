import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  PAYME_BASE_URL: z.url(),
  PAYME_OFFICE_TIMEZONE: z.string().default("Europe/Prague"),
  PAYME_APP_NAME: z.string().default("PayMe"),
  PAYME_MAGIC_LINK_EMAIL_MODE: z.enum(["console", "resend"]).default("console"),
  PAYME_MAGIC_LINK_FROM: z.string().default("PayMe <no-reply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  PASSKEY_RP_ID: z.string().default("localhost"),
  PASSKEY_RP_NAME: z.string().default("PayMe"),
});

export const env = envSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    "postgres://postgres:postgres@127.0.0.1:5432/payme",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-change-me-123456",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3333",
  PAYME_BASE_URL:
    process.env.PAYME_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3333",
  PAYME_OFFICE_TIMEZONE: process.env.PAYME_OFFICE_TIMEZONE,
  PAYME_APP_NAME: process.env.PAYME_APP_NAME,
  PAYME_MAGIC_LINK_EMAIL_MODE: process.env.PAYME_MAGIC_LINK_EMAIL_MODE,
  PAYME_MAGIC_LINK_FROM: process.env.PAYME_MAGIC_LINK_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  PASSKEY_RP_ID: process.env.PASSKEY_RP_ID,
  PASSKEY_RP_NAME: process.env.PASSKEY_RP_NAME,
});
