# ChciPlech Docs

## What is in the repo

- `docs/implementation-plan.md`: the implementation plan captured in-repo
- `docs/next-session-prompt.md`: handoff prompt for the next coding session
- `db/migrations/001_payme_domain.sql`: ChciPlech domain schema
- `db/migrations/002_live_settlement_markers.sql`: live open-month payment markers
- `db/migrations/003_lock_down_supabase_data_api.sql`: Supabase Data API lockdown for public app/auth tables
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
- drinks are modeled as a list; each drink has its own hidden stock slot and NFC tag
- the existing internal shelf record stays hidden from users and acts only as a stock slot
- one active batch per drink at a time
- online-only NFC take flow
- append-only take events
- undo creates compensating events instead of deleting history
- manual admin month close
- immutable settlement lines after close
- live open-month settlements use paid-through markers, so settled drinks are not charged again at month close

## UI overview

- Design direction: receipt / ledger paper. Cream background, Fraunces display serif, JetBrains Mono for tabular numbers, hot ember accent, moss green for paid, stamp red for due. Tokens live in `src/app/globals.css`.
- UI is **mobile-first** (iPhone Safari primary target) and **Czech-only** (informal singular).
- `/` – signed-in ledger: balance cards (dlužíš / dluží ti), drink list with stock/tap links, tvé odběry, nav links. Signed out shows a compact hero with one CTA.
- `/sign-in` – magic link + passkey shortcut. Supports `?next=` and `?from=nfc` for post-auth return.
- `/t/[tagToken]` – NFC take screen. Bare NFC URLs auto-record +1, show a live two-minute undo button for wrong-tag taps, and keep the manual +1/+2/+3 buttons behind `?mode=manual`.
- `/shelves` – stock-style overview for each drink, who stocked it, who took from the active batch, open per-person drink debts with shareable Czech SPD QR images, debtor-side "mám zaplaceno", incoming payment confirmations, and batch forms ("zapiš nákup").
- `/account` – payout account editor (prefix/účet/banka/IBAN) + passkey enrollment.
- `/admin` – admin-only. Pití a štítky (drink list with NFC URLs + re-mint button per drink + add-drink form), Dávky (recent stockups with an admin-only move-to-drink correction), and Lidé (members + invites).
- `/report/[yyyy-mm]` – monthly folio. Dlužíš / Dluží ti columns with shareable Czech SPD QR images for unpaid debts; debtor-side and creditor-side mark-paid; admin close button for open months.

## Operational notes

- Use `pnpm` for dependency and script management in this repo
- Local app default port is `3333`; keep `BETTER_AUTH_URL` and `PAYME_BASE_URL` aligned with it unless you intentionally override the port
- Keep `.env*` out of Vercel CLI deploy uploads via `.vercelignore`; otherwise a local `.env.local` can override production envs during `vercel --prod`
- Database env resolution is `DATABASE_URL` first, then `POSTGRES_URL`; this lets the Vercel Supabase integration work without duplicating the Postgres URL
- Supabase/Vercel runtime Postgres currently uses the project SSL override (`sslmode=no-verify`, `rejectUnauthorized: false`) because the hosted chain does not verify cleanly in Node. To move back to verified TLS, put the CA bundle in `DATABASE_SSL_CA_CERT` or `POSTGRES_CA_CERT`; the pool will then use `sslmode=verify-full` with `rejectUnauthorized: true`.
- Supabase's generated Data API is not part of the app contract. Keep public tables RLS-enabled and keep `anon`/`authenticated` grants revoked; access should go through Next.js server actions/API routes backed by the server Postgres pool.
- Better Auth tables are managed by `pnpm run auth:migrate`
- ChciPlech tables are managed by `pnpm run db:migrate`
- Resend email delivery is already implemented in `src/lib/auth.ts`; enable it with `PAYME_MAGIC_LINK_EMAIL_MODE=resend`, `RESEND_API_KEY`, and a valid `PAYME_MAGIC_LINK_FROM`
- Production env validation fails closed: no development auth secret, no console magic-link email, no localhost passkey RP ID, and `BETTER_AUTH_URL` / `PAYME_BASE_URL` must be HTTPS on the same origin.
- Admin invites now send a real invite email through Resend via `src/lib/emails.ts`; pending invites can be bulk-sent from `/admin` without retyping addresses
- Transactional emails in `src/lib/emails.ts` use conservative table-based inline HTML so they survive stricter mail clients without broken layout
- For deployment, runtime secrets belong in Vercel Project Environment Variables, not GitHub Secrets
- payout accounts are required before a member can be a creditor in a month close
- payout accounts are also required before a live open-month QR can be shown for that creditor
- first-user admin bootstrap is disabled; fresh environments need an existing member/invite seeded before public exposure
- custom app POST routes and server actions reject cross-origin mutation requests before session lookup
- common browser security headers are configured in `next.config.ts`
- UI mutations prefer server actions (`src/lib/actions.ts`); only the NFC take/undo flow uses the API routes directly because it needs a client-supplied idempotency key
- `setupShelfAction` creates product + hidden stock slot + tag sequentially (non-atomic — if the slot insert fails, retry; admin can delete the dangling product if needed)
- adding a drink creates a fresh product + hidden stock slot + tag; existing drinks remain visible and keep their own history/tags
- live smoke-tested locally against Postgres: existing admin/member invites, payout account save, batch creation, NFC sign-in redirect, take, undo, month close, Czech QR render, and mark-paid flows
- report summary cards stay status-neutral (`dlužíš`, `dluží ti`) because the amounts can be fully paid while the historical total for the month remains non-zero
- command-layer `PaymeError.message` strings are in Czech so they surface cleanly in the UI
