# Next Session Prompt

Use this prompt at the start of the next ChciPlech session:

---

You are continuing work on `ChciPlech`, a lightweight friends-only office snack ledger at `/Users/kaldy/Data/Repos/payme`.

## Main purpose

This app is for a small group of friends/colleagues with iPhones in the Czech Republic:

- people buy packs of drinks/snacks for the office
- others take items from the shared drink stash
- NFC tags open the app flow per drink
- the app records who took what from the active batch
- at month end, the app shows who owes whom and generates Czech QR payment payloads

Important product constraints:

- keep it lightweight and pragmatic
- **mobile-first** — iPhone Safari is the primary target; web is secondary
- **Czech-only UI**, informal singular (tykání)
- one office/friend group only
- multiple drinks/tags are supported
- UI does not expose any location/place field
- one active batch per drink
- online-only at tap time
- manual admin month close
- append-only take events with compensating undo/correction behavior

## Current status

Backend, auth, API routes, and a simplified, Czech, mobile-first UI are all implemented.

Landed in the UI pass (iteration 2):

- receipt/ledger design system in `src/app/globals.css` (Fraunces + JetBrains Mono, ember/moss/stamp palette, hairline rules, stamps, perforations; `overflow-x: clip` on `html`/`body` + `min-width: 0` safety)
- shared masthead + short-word nav (přehled · nákup · účet · správa) + Czech ticker in `src/components/app-shell.tsx`
- `/` — signed-in ledger (balance cards dlužíš / dluží ti, drink list, tvé odběry) and a compact signed-out hero
- `/sign-in` — magic link + passkey with `?next=` and `?from=nfc` support
- `/t/[tagToken]` — NFC take flow: +1 primary button, +2/+3, live two-minute undo, vlastní-dávka guard, rozebráno/neznámé-štítek states
- `/shelves` — "zapiš nákup" forms for the configured drinks
- `/account` — český účet editor + passkey enrollment
- `/admin` — two panels: Pití a štítky (drink list with NFC URL + re-mint per drink + add-drink form) and Lidé (members + invites)
- `/report/[yyyy-mm]` — Dlužíš / Dluží ti columns with Czech SPD QR images, mark-paid, admin close-month with confirm
- server actions in `src/lib/actions.ts` wrap `src/lib/payme/commands.ts` for all non-NFC mutations and `setupShelfAction` adds a new drink + hidden stock slot + tag
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
- Optional polish: per-drink take history, CSV export of the monthly folio, notifications when stock goes empty.

## Implementation constraints

- Keep mobile-first. Don't add layouts that overflow 390px viewports.
- Keep it Czech. If you add copy, it goes in Czech with informal singular.
- Keep place/location fields hidden, but preserve the multi-drink UI.
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
