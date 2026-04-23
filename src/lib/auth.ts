import { PostgresDialect } from "kysely";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";

import { pool } from "@/lib/db/pool";
import { env } from "@/lib/env";
import {
  assertAuthEmailAllowed,
  syncMemberAfterAuthUserCreate,
} from "@/lib/payme/commands";

async function sendMagicLinkEmail(data: { email: string; url: string }) {
  if (env.PAYME_MAGIC_LINK_EMAIL_MODE === "console") {
    console.log(`[payme-magic-link] ${data.email} -> ${data.url}`);
    return;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when PAYME_MAGIC_LINK_EMAIL_MODE=resend");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.PAYME_MAGIC_LINK_FROM,
      to: [data.email],
      subject: `${env.PAYME_APP_NAME} sign-in link`,
      html: `<p>Open this link to sign in to ${env.PAYME_APP_NAME}:</p><p><a href="${data.url}">${data.url}</a></p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send magic link email: ${response.status}`);
  }
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: false,
  },
  database: new PostgresDialect({
    pool,
  }),
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await assertAuthEmailAllowed(email);
        await sendMagicLinkEmail({ email, url });
      },
    }),
    passkey({
      rpID: env.PASSKEY_RP_ID,
      rpName: env.PASSKEY_RP_NAME,
      origin: env.BETTER_AUTH_URL,
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          await assertAuthEmailAllowed(user.email);
        },
        after: async (user) => {
          await syncMemberAfterAuthUserCreate({
            userId: user.id,
            email: user.email,
            name: user.name,
          });
        },
      },
    },
  },
});
