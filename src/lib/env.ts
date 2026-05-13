import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const developmentAuthSecret = "development-only-secret-change-me-123456";

function developmentDefault(value: string | undefined, fallback: string) {
  return value ?? (isProduction ? undefined : fallback);
}

function originOf(value: string) {
  return new URL(value).origin;
}

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  PAYME_BASE_URL: z.url(),
  PAYME_OFFICE_TIMEZONE: z.string().default("Europe/Prague"),
  PAYME_APP_NAME: z.string().default("ChciPlech"),
  PAYME_MAGIC_LINK_EMAIL_MODE: z.enum(["console", "resend"]).default("console"),
  PAYME_MAGIC_LINK_FROM: z.string().default("ChciPlech <no-reply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  PASSKEY_RP_ID: z.string().default("localhost"),
  PASSKEY_RP_NAME: z.string().default("ChciPlech"),
  DATABASE_SSL_CA_CERT: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!isProduction) return;

  const secureUrlFields = [
    ["BETTER_AUTH_URL", value.BETTER_AUTH_URL],
    ["PAYME_BASE_URL", value.PAYME_BASE_URL],
  ] as const;

  for (const [field, url] of secureUrlFields) {
    if (new URL(url).protocol !== "https:") {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `${field} must use HTTPS in production.`,
      });
    }
  }

  if (originOf(value.BETTER_AUTH_URL) !== originOf(value.PAYME_BASE_URL)) {
    ctx.addIssue({
      code: "custom",
      path: ["PAYME_BASE_URL"],
      message: "PAYME_BASE_URL and BETTER_AUTH_URL must use the same origin in production.",
    });
  }

  if (value.BETTER_AUTH_SECRET === developmentAuthSecret) {
    ctx.addIssue({
      code: "custom",
      path: ["BETTER_AUTH_SECRET"],
      message: "BETTER_AUTH_SECRET must not use the development fallback in production.",
    });
  }

  if (value.PAYME_MAGIC_LINK_EMAIL_MODE !== "resend") {
    ctx.addIssue({
      code: "custom",
      path: ["PAYME_MAGIC_LINK_EMAIL_MODE"],
      message: "PAYME_MAGIC_LINK_EMAIL_MODE must be resend in production.",
    });
  }

  if (!value.RESEND_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: "RESEND_API_KEY is required in production.",
    });
  }

  if (value.PAYME_MAGIC_LINK_FROM.includes("example.com")) {
    ctx.addIssue({
      code: "custom",
      path: ["PAYME_MAGIC_LINK_FROM"],
      message: "PAYME_MAGIC_LINK_FROM must use a verified production sender.",
    });
  }

  if (value.PASSKEY_RP_ID === "localhost") {
    ctx.addIssue({
      code: "custom",
      path: ["PASSKEY_RP_ID"],
      message: "PASSKEY_RP_ID must be the production domain.",
    });
  }
});

export const env = envSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    developmentDefault(undefined, "postgres://postgres:postgres@127.0.0.1:5432/payme"),
  BETTER_AUTH_SECRET: developmentDefault(
    process.env.BETTER_AUTH_SECRET,
    developmentAuthSecret,
  ),
  BETTER_AUTH_URL: developmentDefault(process.env.BETTER_AUTH_URL, "http://localhost:3333"),
  PAYME_BASE_URL:
    process.env.PAYME_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    developmentDefault(undefined, "http://localhost:3333"),
  PAYME_OFFICE_TIMEZONE: process.env.PAYME_OFFICE_TIMEZONE,
  PAYME_APP_NAME: process.env.PAYME_APP_NAME,
  PAYME_MAGIC_LINK_EMAIL_MODE: process.env.PAYME_MAGIC_LINK_EMAIL_MODE,
  PAYME_MAGIC_LINK_FROM: process.env.PAYME_MAGIC_LINK_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  PASSKEY_RP_ID: developmentDefault(process.env.PASSKEY_RP_ID, "localhost"),
  PASSKEY_RP_NAME: process.env.PASSKEY_RP_NAME,
  DATABASE_SSL_CA_CERT: process.env.DATABASE_SSL_CA_CERT ?? process.env.POSTGRES_CA_CERT,
});
