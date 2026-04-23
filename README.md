# PayMe

PayMe is a web-first, friends-only office snack ledger for iPhone users.

The product goal is simple:

- buyers add packs of drinks or snacks they brought in
- shelf NFC tags open a product URL in iPhone Safari
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

Vercel no longer provisions its old first-party Postgres for new projects; the current official path is a Marketplace Postgres integration. Source: [Vercel Postgres docs](https://vercel.com/docs/postgres), [Vercel Marketplace storage docs](https://vercel.com/docs/marketplace-storage)

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

5. Run PayMe domain migrations:

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
