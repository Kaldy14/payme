import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { OpenDebts } from "@/components/open-debts";
import { formatCzk } from "@/lib/format";
import { getSessionMember } from "@/lib/payme/session";
import {
  listOpenDebtsByProduct,
  listShelves,
  listShelfStockOverviews,
  type ShelfStockOverview,
} from "@/lib/payme/ui-queries";
import { BatchForm } from "./batch-form";

export const dynamic = "force-dynamic";

export default async function ShelvesPage() {
  const member = await getSessionMember();
  if (!member) redirect("/sign-in?next=/shelves");

  const [shelves, stock, debts] = await Promise.all([
    listShelves(),
    listShelfStockOverviews(),
    listOpenDebtsByProduct(member.memberId),
  ]);

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <span className="eyebrow">police</span>
        <h1 className="display text-[2.2rem] sm:text-[2.8rem] leading-tight mt-2">
          Stav, dluhy, <span className="display-italic text-ember">nákup</span>.
        </h1>
        <p className="rubric mt-2 text-[0.96rem]">
          Co je zrovna na skladě, kdo si bral z čí dávky a co můžeš rovnou
          vyrovnat.
        </p>

        {stock.length > 0 ? (
          <StockOverview shelves={stock} />
        ) : (
          <NoShelves memberRole={member.role} />
        )}

        <OpenDebts debts={debts} />

        <div className="mt-6">
          {shelves.length > 0 && (
            <div className="mt-10">
              <div className="flex items-baseline justify-between border-b border-ink pb-2">
                <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
                  Zapiš nákup
                </h2>
                <span className="eyebrow text-ink-faint">{shelves.length}×</span>
              </div>
              <p className="rubric mt-2 text-[0.92rem]">
                Když je aktivní dávka plná, nový nákup čeká v pořadí.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {shelves.map((shelf) => (
                  <BatchForm key={shelf.id} shelf={shelf} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function StockOverview({ shelves }: { shelves: ShelfStockOverview[] }) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
          Aktuální stav
        </h2>
        <span className="eyebrow text-ink-faint">{shelves.length}×</span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {shelves.map((shelf) => (
          <StockCard key={shelf.shelf_id} shelf={shelf} />
        ))}
      </div>
    </section>
  );
}

function StockCard({ shelf }: { shelf: ShelfStockOverview }) {
  const remaining = shelf.quantity_remaining ?? 0;
  const total = shelf.quantity_total ?? 0;
  const unit = shelf.unit_label ?? "ks";
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <article className="paper-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">sklad</div>
          <h2 className="display text-[1.45rem] sm:text-[1.7rem] leading-tight mt-0.5 break-words">
            {shelf.product_name}
          </h2>
        </div>
        {shelf.active_batch_id ? (
          <span className="stamp stamp-paid shrink-0">aktivní</span>
        ) : (
          <span className="stamp stamp-closed shrink-0">prázdné</span>
        )}
      </div>

      {shelf.active_batch_id ? (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="tabular text-[2.2rem] sm:text-[2.6rem] leading-none">
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
            <div className="h-full bg-ember" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="mt-2 text-[0.8rem] text-ink-soft">
            naskladnil/a{" "}
            <span className="font-semibold text-ink">{shelf.buyer_name ?? "—"}</span>
            {shelf.queued_batches > 0 && (
              <span className="tabular text-ember-deep">
                {" "}
                · +{shelf.queued_batches} čeká
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-dashed border-rule pt-3">
            <div className="eyebrow text-ink-faint">kdo si vzal</div>
            {shelf.takes.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1.5">
                {shelf.takes.map((take) => (
                  <li
                    key={take.member_id}
                    className="flex items-baseline justify-between gap-3 text-[0.92rem]"
                  >
                    <span className="truncate">{take.member_name}</span>
                    <span className="tabular whitespace-nowrap">
                      {take.units} {unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[0.9rem] text-ink-soft italic">
                Z téhle dávky si zatím nikdo cizí nevzal.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-ink-soft italic text-[0.94rem]">
          Žádná aktivní dávka. Zapiš nový nákup níž.
        </p>
      )}
    </article>
  );
}

function NoShelves({ memberRole }: { memberRole: "admin" | "member" }) {
  return (
    <div className="paper-card mt-8 p-5 text-center">
      <span className="stamp stamp-closed mx-auto">bez pití</span>
      <p className="rubric mt-3 text-[0.96rem]">Pití ještě není nastavené.</p>
      {memberRole === "admin" && (
        <Link href="/admin" className="btn btn-ghost mt-4">
          přejít do správy
        </Link>
      )}
    </div>
  );
}
