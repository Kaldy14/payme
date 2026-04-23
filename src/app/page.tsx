import Link from "next/link";

import { PageFrame } from "@/components/app-shell";
import { currentMonthKey, formatCzk, formatMonthKey, formatShortDate } from "@/lib/format";
import { getSessionMember } from "@/lib/payme/session";
import {
  getOpenMonthSummary,
  listRecentTakes,
  listShelfOverviews,
  type ShelfOverview,
} from "@/lib/payme/ui-queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const member = await getSessionMember();

  if (!member) {
    return <SignedOutView />;
  }

  const [shelves, summary, takes] = await Promise.all([
    listShelfOverviews(),
    getOpenMonthSummary(member.memberId),
    listRecentTakes(member.memberId, 6),
  ]);

  const shelf = shelves[0] ?? null;
  const month = currentMonthKey();
  const firstName = member.displayName.split(" ")[0];

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1 reveal">
          <span className="eyebrow">doma · {formatMonthKey(month)}</span>
          <h1 className="display text-[2.2rem] leading-[1] sm:text-[3.4rem]">
            Čau, <span className="display-italic text-ember">{firstName}</span>!
          </h1>
          <p className="rubric mt-2 text-[0.98rem] sm:text-[1.08rem]">
            Tady je tvůj otevřený účet za tenhle měsíc.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-5 reveal reveal-1">
          <BalanceCard
            eyebrow="dlužíš"
            amountMinor={summary.owed_minor}
            tone={summary.owed_minor > 0 ? "debt" : "zero"}
            footnote={
              summary.owed_minor > 0
                ? "Splatné při uzavření měsíce."
                : "Čisto. Drž to tak."
            }
          />
          <BalanceCard
            eyebrow="dluží ti"
            amountMinor={summary.owed_to_me_minor}
            tone={summary.owed_to_me_minor > 0 ? "credit" : "zero"}
            footnote={
              summary.owed_to_me_minor > 0
                ? "Od těch, co si brali z tvých nákupů."
                : "Zatím ti nikdo nic nedluží."
            }
          />
        </div>

        {shelf ? <ShelfCard shelf={shelf} /> : <NoShelf isAdmin={member.role === "admin"} />}

        <RecentTakes takes={takes} />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/report/${month}`} className="btn">
            konec měsíce →
          </Link>
          <Link href="/shelves" className="btn btn-ghost">
            něco jsem přinesl/a
          </Link>
          <Link href="/account" className="btn btn-ghost">
            kam mi poslat
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

function BalanceCard({
  eyebrow,
  amountMinor,
  tone,
  footnote,
}: {
  eyebrow: string;
  amountMinor: number;
  tone: "debt" | "credit" | "zero";
  footnote: string;
}) {
  const accent =
    tone === "debt"
      ? "text-stamp-red"
      : tone === "credit"
        ? "text-moss-deep"
        : "text-ink-faint";

  return (
    <div className="paper-card relative overflow-hidden p-5 sm:p-6">
      <span className="eyebrow block">{eyebrow}</span>
      <div
        className={`mt-2 tabular leading-none text-[2rem] sm:text-[2.8rem] ${accent}`}
      >
        {formatCzk(amountMinor)}
      </div>
      <p className="mt-3 text-[0.88rem] sm:text-[0.92rem] text-ink-soft">
        {footnote}
      </p>
    </div>
  );
}

function ShelfCard({ shelf }: { shelf: ShelfOverview }) {
  const remaining = shelf.quantity_remaining ?? 0;
  const total = shelf.quantity_total ?? 0;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const unit = shelf.unit_label ?? "ks";
  const isEmpty = shelf.active_batch_id === null || remaining === 0;
  const isLow =
    shelf.active_batch_id !== null && remaining <= Math.max(2, total * 0.15);

  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
          Polička
        </h2>
        {isEmpty ? (
          <span className="stamp stamp-closed">prázdná</span>
        ) : isLow ? (
          <span className="stamp stamp-active">dochází</span>
        ) : (
          <span className="stamp stamp-paid">plno</span>
        )}
      </div>

      <div className="paper-card mt-3 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow truncate">{shelf.product_name}</div>
            <h3 className="display text-[1.3rem] sm:text-[1.6rem] leading-tight mt-0.5 break-words">
              {shelf.shelf_name}
            </h3>
          </div>
          {shelf.tag_token && (
            <Link
              href={`/t/${shelf.tag_token}`}
              className="link-inline text-[0.78rem] tabular whitespace-nowrap"
            >
              otevřít odběr →
            </Link>
          )}
        </div>

        {shelf.active_batch_id ? (
          <>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="tabular text-[2rem] sm:text-[2.4rem] leading-none">
                {remaining}
              </span>
              <span className="tabular text-sm text-ink-soft">
                / {total} {unit}
              </span>
              <span className="ml-auto tabular text-[0.82rem] text-ink-soft whitespace-nowrap">
                {formatCzk(shelf.unit_price_minor ?? 0)}/{unit}
              </span>
            </div>
            <div className="mt-3 h-[6px] w-full bg-paper-deep overflow-hidden">
              <div
                className="h-full bg-ember transition-all"
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2 text-[0.78rem] text-ink-soft">
              <span className="truncate">
                zaplatil/a <span className="italic">{shelf.buyer_name ?? "—"}</span>
              </span>
              {shelf.queued_batches > 0 && (
                <span className="tabular text-ember-deep whitespace-nowrap">
                  +{shelf.queued_batches} v pořadí
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 text-ink-soft italic text-[0.94rem]">
            Žádná aktivní dávka. Když někdo přinese novou, zapiš ji.
          </p>
        )}
      </div>
    </section>
  );
}

function NoShelf({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="paper-card mt-9 p-5 sm:p-6 text-center">
      <span className="stamp stamp-closed mx-auto">bez poličky</span>
      <div className="display text-[1.4rem] sm:text-[1.7rem] mt-3">
        Polička ještě není nastavená.
      </div>
      <p className="rubric mt-2 text-[0.98rem]">
        {isAdmin
          ? "Jako admin ji nastavíš v sekci správa."
          : "Požádej admina, aby ji nastavil."}
      </p>
      {isAdmin && (
        <Link href="/admin" className="btn btn-ghost mt-4">
          přejít do správy
        </Link>
      )}
    </div>
  );
}

function RecentTakes({
  takes,
}: {
  takes: Awaited<ReturnType<typeof listRecentTakes>>;
}) {
  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
          Naposledy
        </h2>
        <span className="eyebrow text-ink-faint">{takes.length}</span>
      </div>
      {takes.length === 0 ? (
        <div className="paper-card mt-3 p-5 text-center">
          <p className="rubric text-[0.96rem]">
            Zatím nic. Ťukni na štítek, až si budeš brát.
          </p>
        </div>
      ) : (
        <ul className="mt-2">
          {takes.map((t) => {
            const isUndo = t.delta_units < 0;
            const qty = Math.abs(t.delta_units);
            const amount = Math.abs(t.delta_units) * t.unit_price_minor;
            return (
              <li
                key={t.id}
                className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-dashed border-rule py-2.5"
              >
                <span
                  className={`tabular self-center text-[1.05rem] ${
                    isUndo ? "text-ink-faint" : "text-ember"
                  }`}
                >
                  {isUndo ? "↶" : "+"}
                  {qty}
                </span>
                <div className="min-w-0">
                  <div className="text-[0.94rem] truncate">{t.product_name}</div>
                  <div className="text-[0.74rem] text-ink-soft truncate">
                    {formatShortDate(t.occurred_at)}
                    {t.source === "nfc" ? " · ťuk" : ` · ${t.source}`}
                  </div>
                </div>
                <span
                  className={`tabular self-center text-[0.88rem] whitespace-nowrap ${
                    isUndo ? "text-ink-faint line-through" : "text-ink"
                  }`}
                >
                  {formatCzk(amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SignedOutView() {
  return (
    <PageFrame member={null}>
      <section className="mx-auto max-w-lg px-5 py-12 sm:px-8 sm:py-20 text-center">
        <span className="eyebrow">knížka pro parťáky</span>
        <h1 className="display text-[2.8rem] sm:text-[4rem] leading-[0.98] mt-3">
          Ťukni.{" "}
          <span className="display-italic text-ember">Vezmi</span>.
          <br />
          Vyrovnej.
        </h1>
        <p className="rubric mt-4 text-[1rem] sm:text-[1.1rem]">
          Kamarádská účetní knížka pro jednu polici v kanceláři. Na konci měsíce
          QR platba pro české banky, žádná matika v hlavě.
        </p>
        <div className="mt-7 flex justify-center">
          <Link href="/sign-in" className="btn btn-ember btn-xl">
            přihlásit se →
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}
