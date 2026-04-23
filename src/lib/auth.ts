import { PostgresDialect } from "kysely";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";

import { pool } from "@/lib/db/pool";
import { sendMagicLinkEmail } from "@/lib/emails";
import { env } from "@/lib/env";
import {
  assertAuthEmailAllowed,
  syncMemberAfterAuthUserCreate,
} from "@/lib/payme/commands";

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
