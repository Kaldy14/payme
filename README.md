# ChciPlech

ChciPlech is a web-first, friends-only office snack ledger for iPhone users.

The product goal is simple:

- buyers add packs of drinks or snacks they brought in
- one NFC tag opens the current drink URL in iPhone Safari
- the app records who took what from the active batch
- the month closes manually
- each person gets a clear Czech QR payment summary for who they owe

## Stack

- `Next.js 16` App Router
- `better-auth` for magic-link auth with optional passkeys
- `PostgreSQL`
- server-side transactional command handlers for stock and ledger changes

## Current implementation status

The repository currently includes:

- environment validation
- auth wiring with magic links and passkeys
- SQL domain migrations
- transactional backend commands and API routes
- mobile-first UI for sign-in, take flow, admin setup, shelves, account, and monthly reports
- Czech QR Platba payload and QR rendering
- project plan and architecture docs

The app has been smoke-tested locally against PostgreSQL for:

- admin bootstrap
- member invite flow
- payout-account save
- batch creation
- NFC take + undo
- month close
- report QR rendering
- mark-paid flow

## Deployment

Recommended production split:

- frontend: `Vercel`
- database: hosted Postgres such as `Supabase` or `Neon`
- email: `Resend` for magic-link delivery

Vercel no longer provisions its old first-party Postgres for new projects; the current official path is a Marketplace Postgres integration. Source: [Vercel Postgres docs](https://vercel.com/docs/postgres), [Vercel Marketplace storage docs](https://vercel.com/docs/marketplace-storage)

If you install the Supabase Vercel integration, ChciPlech now accepts the injected `POSTGRES_URL` automatically. You do not need to duplicate it into `DATABASE_URL` unless you want to override it explicitly.

### Magic-link email with Resend

Resend is already wired in [`src/lib/auth.ts`](src/lib/auth.ts). To enable it:

1. Set `PAYME_MAGIC_LINK_EMAIL_MODE=resend`
2. Set `RESEND_API_KEY`
3. Set `PAYME_MAGIC_LINK_FROM` to a sender/domain verified in Resend

For a deployed app, put these values in **Vercel Project Environment Variables**, not GitHub Secrets.

Use Vercel env for runtime/build variables:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `PAYME_BASE_URL`
- `DATABASE_URL`
- `PAYME_MAGIC_LINK_EMAIL_MODE`
- `PAYME_MAGIC_LINK_FROM`
- `RESEND_API_KEY`
- `PAYME_OFFICE_TIMEZONE`
- `PAYME_APP_NAME`
- `PASSKEY_RP_ID`
- `PASSKEY_RP_NAME`

GitHub Secrets are only the right place if you later add a GitHub Actions workflow that needs them during CI. This app reads its auth/email config at build/runtime on Vercel, so GitHub Secrets do nothing for the deployed app.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`
3. Install dependencies:

```bash
pnpm install
```

4. Run auth migrations:

```bash
pnpm run auth:migrate
```

5. Run ChciPlech domain migrations:

```bash
pnpm run db:migrate
```

6. Start the app:

```bash
pnpm run dev
```

The app listens on [http://localhost:3333](http://localhost:3333) by default.

## Docs

- [docs/README.md](docs/README.md)
- [docs/implementation-plan.md](docs/implementation-plan.md)
