# Next Session Prompt

Use this prompt at the start of the next ChciPlech session:

---

You are continuing work on `ChciPlech`, a lightweight friends-only office snack ledger at `/Users/kaldy/Data/Repos/payme`.

## Main purpose

This app is for a small group of friends/colleagues with iPhones in the Czech Republic:

- people buy packs of drinks/snacks for the office
- others take items from the shelf
- NFC tags on shelves open the app flow
- the app records who took what from the active batch
- at month end, the app shows who owes whom and generates Czech QR payment payloads

Important product constraints:

- keep it lightweight and pragmatic
- **mobile-first** — iPhone Safari is the primary target; web is secondary
- **Czech-only UI**, informal singular (tykání)
- one office/friend group only
- **one shelf** in v1 (UI does not expose multi-shelf management)
- one fixed product per shelf
- one active batch per shelf
- online-only at the shelf
- manual admin month close
- append-only take events with compensating undo/correction behavior

## Current status

Backend, auth, API routes, and a simplified, Czech, mobile-first UI are all implemented.

Landed in the UI pass (iteration 2):

- receipt/ledger design system in `src/app/globals.css` (Fraunces + JetBrains Mono, ember/moss/stamp palette, hairline rules, stamps, perforations; `overflow-x: clip` on `html`/`body` + `min-width: 0` safety)
- shared masthead + short-word nav (přehled · nákup · účet · správa) + Czech ticker in `src/components/app-shell.tsx`
- `/` — signed-in ledger (balance cards dlužíš / dluží ti, single-shelf card, tvé odběry) and a compact signed-out hero
- `/sign-in` — magic link + passkey with `?next=` and `?from=nfc` support
- `/t/[tagToken]` — NFC take flow: +1 primary button, +2/+3, live two-minute undo, vlastní-dávka guard, rozebráno/neznámé-štítek states
- `/shelves` — single "zapiš nákup" form (no shelf list; single shelf assumed)
- `/account` — český účet editor + passkey enrollment
- `/admin` — two panels: Polička (bootstrap wizard that creates product + shelf + tag in one submit if missing, otherwise shelf name + NFC URL + re-mint) and Lidé (members + invites)
- `/report/[yyyy-mm]` — Dlužíš / Dluží ti columns with Czech SPD QR images, mark-paid, admin close-month with confirm
- server actions in `src/lib/actions.ts` wrap `src/lib/payme/commands.ts` for all non-NFC mutations and `setupShelfAction` bootstraps a fresh group
- UI data helpers in `src/lib/payme/ui-queries.ts`
- formatters in `src/lib/format.ts` use `cs-CZ` throughout
- error messages in `src/lib/payme/commands.ts` + `authz.ts` are Czech so they surface cleanly

Verification: `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build` all pass. Landing, sign-in, and NFC gate spot-checked in Helium at 390px (iPhone 13 viewport) — no horizontal overflow. The signed-in flows (home, take, report, admin, account) still need a live smoke-test with a valid session.

## Read these first

- plan: `/Users/kaldy/Data/Repos/payme/docs/implementation-plan.md`
- docs index: `/Users/kaldy/Data/Repos/payme/docs/README.md`
- repo overview/setup: `/Users/kaldy/Data/Repos/payme/README.md`
- project instructions: `/Users/kaldy/Data/Repos/payme/AGENTS.md`

Main implementation files:

- auth: `/Users/kaldy/Data/Repos/payme/src/lib/auth.ts`
- auth client: `/Users/kaldy/Data/Repos/payme/src/lib/auth-client.ts`
- server commands: `/Users/kaldy/Data/Repos/payme/src/lib/payme/commands.ts`
- server actions (UI forms): `/Users/kaldy/Data/Repos/payme/src/lib/actions.ts`
- queries/report helpers: `/Users/kaldy/Data/Repos/payme/src/lib/payme/queries.ts`
- UI queries: `/Users/kaldy/Data/Repos/payme/src/lib/payme/ui-queries.ts`
- request schemas: `/Users/kaldy/Data/Repos/payme/src/lib/payme/schemas.ts`
- payments/QR payloads: `/Users/kaldy/Data/Repos/payme/src/lib/payme/payments.ts`
- API routes: `/Users/kaldy/Data/Repos/payme/src/app/api`
- UI shell: `/Users/kaldy/Data/Repos/payme/src/components/app-shell.tsx`
- design tokens: `/Users/kaldy/Data/Repos/payme/src/app/globals.css`
- migration: `/Users/kaldy/Data/Repos/payme/db/migrations/001_payme_domain.sql`

## What is left to do

- Smoke-test the signed-in flows end-to-end on an actual iPhone (magic-link sign-in, passkey enrollment, setup wizard for a fresh group, batch recording, NFC tap/undo, month close, mark paid).
- Wire real NFC tag programming (admin copies the NFC URL from `/admin` and programs it via an iPhone NFC app).
- Optional polish: per-shelf take history, CSV export of the monthly folio, notifications when a shelf goes empty.

## Implementation constraints

- Keep mobile-first. Don't add layouts that overflow 390px viewports.
- Keep it Czech. If you add copy, it goes in Czech with informal singular.
- Keep a single shelf. Don't add multi-shelf UI patterns.
- Do not move business-critical writes into client-side code. Use the server actions in `src/lib/actions.ts` or the existing API routes.
- Keep docs updated when the UI phase changes materially.
- Because of local repo rules, relevant changes should also be reflected in:
  - `/Users/kaldy/Data/Repos/payme/AGENTS.md`
  - `/Users/kaldy/Data/Repos/payme/docs/README.md`

## Verification expectations

After any new UI or backend work:

- run `pnpm run typecheck`
- run `pnpm run lint`
- run `pnpm run build`
- if touching UI, verify at 390px viewport (iPhone 13 width) that nothing overflows and copy reads naturally in Czech

If UI introduces new assumptions or API mismatches, fix them instead of documenting them away.

---
