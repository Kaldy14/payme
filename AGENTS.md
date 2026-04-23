<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PayMe Project Notes

- Keep the app web-first and iPhone Safari-first for NFC taps until a native client exists.
- Use `pnpm` as the package manager for installs, scripts, and lockfile updates.
- Default local web port is `3333`; keep new local run instructions and auth/base URL examples aligned with that port.
- Runtime/deployment secrets (database, auth, Resend) belong in Vercel project env vars; GitHub Secrets are only for CI workflows.
- Treat `POSTGRES_URL` from Vercel/Supabase as a valid runtime DB source; do not require a duplicated `DATABASE_URL` unless an explicit override is needed.
- Keep the non-local Postgres SSL override in `src/lib/db/pool.ts` when using Supabase/Vercel (`sslmode=no-verify` plus `rejectUnauthorized: false` for remote hosts) unless the deployment is moved to a CA chain that verifies cleanly.
- Treat money and stock changes as transactional server-side commands. Do not move write logic into the browser.
- Use app-layer auth with `better-auth`; the client must not write directly to Postgres or Supabase tables.
- Keep the product intentionally lightweight. Prefer the smallest implementation that preserves ledger correctness.
- Keep the current handoff prompt accurate in `docs/next-session-prompt.md` when major milestones land.
- Admin invites are expected to send real email now. Preserve the `src/lib/emails.ts` invite flow and the `/admin` bulk resend path for pending invites.
- UI aesthetic is "receipt / ledger paper": cream background, Fraunces display, JetBrains Mono for tabular numbers, hot ember accent. Keep new UI visually consistent with the tokens in `src/app/globals.css`.
- Mutations go through server actions in `src/lib/actions.ts` (which wrap `src/lib/payme/commands.ts`), never direct client-side SQL. The only client-side mutation path is `POST /api/takes` and `POST /api/takes/:id/undo` from the NFC take screen (both already authorised server-side).
- When touching settlement or report UI, re-check the real paid/open states in `/report/[yyyy-mm]`; summary cards must not imply an open debt once all lines are paid.
- UI is mobile-first (iPhone Safari). Keep headings and cards sized for ~390px viewports and stack multi-column grids on base widths, opening up only at `sm:` and above.
- UI is Czech-only. All member-facing copy (including `PaymeError.message` from `src/lib/payme/commands.ts` and `src/lib/payme/authz.ts`) stays in Czech, using informal singular ("ty") — it's a friends-only group. Keep error strings short and human.
- V1 assumes a single shelf. Don't add multi-shelf UI (dropdowns, grids). The admin workshop shows either a bootstrap form (`SetupShelfForm`, creates product + shelf + tag) or the single existing shelf with a tag re-mint.
