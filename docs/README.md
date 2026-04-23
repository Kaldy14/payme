# PayMe Docs

## What is in the repo

- `docs/implementation-plan.md`: the implementation plan captured in-repo
- `docs/next-session-prompt.md`: handoff prompt for the next coding session
- `db/migrations/001_payme_domain.sql`: PayMe domain schema
- `scripts/run-domain-migrations.mjs`: domain migration runner
- `src/lib/auth.ts`: Better Auth configuration
- `src/lib/auth-client.ts`: Better Auth client (magic link + passkey)
- `src/lib/payme/commands.ts`: transactional stock and settlement commands
- `src/lib/payme/queries.ts`: shared query helpers (tag summary, monthly report)
- `src/lib/payme/ui-queries.ts`: listing queries used by the UI pages
- `src/lib/payme/session.ts`: `getSessionMember()` helper for server components
- `src/lib/actions.ts`: server actions wrapping the command layer for UI forms
- `src/lib/format.ts`: CZK / month-key / date formatters (cs-CZ)
- `src/components/app-shell.tsx`: masthead, nav, footer, ticker
- `src/app/**`: UI routes (landing, sign-in, `/t/[tagToken]`, `/report/[month]`, `/shelves`, `/account`, `/admin`)
- `src/app/api/**`: HTTP API surface (still used by the NFC take client for idempotency)

## Product rules captured in code

- one office group only
- **one shelf** in v1 — UI assumes a single shelf and does not expose multi-shelf management
- one fixed product per shelf
- one active batch per shelf
- online-only NFC take flow
- append-only take events
- undo creates compensating events instead of deleting history
- manual admin month close
- immutable settlement lines after close

## UI overview

- Design direction: receipt / ledger paper. Cream background, Fraunces display serif, JetBrains Mono for tabular numbers, hot ember accent, moss green for paid, stamp red for due. Tokens live in `src/app/globals.css`.
- UI is **mobile-first** (iPhone Safari primary target) and **Czech-only** (informal singular).
- `/` – signed-in ledger: balance cards (dlužíš / dluží ti), single shelf card, tvé odběry, nav links. Signed out shows a compact hero with one CTA.
- `/sign-in` – magic link + passkey shortcut. Supports `?next=` and `?from=nfc` for post-auth return.
- `/t/[tagToken]` – NFC take screen. Big +1 button, +2/+3, live two-minute undo timer, vlastní-dávka guard, rozebráno / neznámé-štítek states.
- `/shelves` – single batch form ("zapiš nákup"). No shelf list because there's only one shelf.
- `/account` – payout account editor (prefix/účet/banka/IBAN) + passkey enrollment.
- `/admin` – admin-only. Two panels: Polička (setup wizard if no shelf exists, otherwise shelf name + NFC URL + re-mint button) and Lidé (members + invites).
- `/report/[yyyy-mm]` – monthly folio. Dlužíš / Dluží ti columns with Czech SPD QR images for unpaid debts; debtor-side mark-paid; admin close button for open months.

## Operational notes

- Use `pnpm` for dependency and script management in this repo
- Local app default port is `3333`; keep `BETTER_AUTH_URL` and `PAYME_BASE_URL` aligned with it unless you intentionally override the port
- Database env resolution is `DATABASE_URL` first, then `POSTGRES_URL`; this lets the Vercel Supabase integration work without duplicating the Postgres URL
- Supabase/Vercel runtime Postgres uses SSL; non-local connections are normalized to `sslmode=no-verify` and opened with `rejectUnauthorized: false` in `src/lib/db/pool.ts` so Vercel can connect to Supabase without the self-signed-chain failure
- Better Auth tables are managed by `pnpm run auth:migrate`
- PayMe tables are managed by `pnpm run db:migrate`
- Resend email delivery is already implemented in `src/lib/auth.ts`; enable it with `PAYME_MAGIC_LINK_EMAIL_MODE=resend`, `RESEND_API_KEY`, and a valid `PAYME_MAGIC_LINK_FROM`
- For deployment, runtime secrets belong in Vercel Project Environment Variables, not GitHub Secrets
- payout accounts are required before a member can be a creditor in a month close
- the first authenticated user bootstraps as the initial admin if no members exist yet
- UI mutations prefer server actions (`src/lib/actions.ts`); only the NFC take/undo flow uses the API routes directly because it needs a client-supplied idempotency key
- `setupShelfAction` creates product + shelf + tag sequentially (non-atomic — if the shelf insert fails, retry; admin can delete the dangling product if needed)
- live smoke-tested locally against Postgres: admin bootstrap, invites, payout account save, batch creation, NFC sign-in redirect, take, undo, month close, Czech QR render, and debtor-side mark-paid
- report summary cards stay status-neutral (`dlužíš`, `dluží ti`) because the amounts can be fully paid while the historical total for the month remains non-zero
- command-layer `PaymeError.message` strings are in Czech so they surface cleanly in the UI
