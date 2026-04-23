import Link from "next/link";

import { PageFrame } from "@/components/app-shell";
import { formatCzk } from "@/lib/format";
import { getTagSummary } from "@/lib/payme/queries";
import { getSessionMember } from "@/lib/payme/session";
import { getLatestOwnTakeForTag } from "@/lib/payme/ui-queries";
import { TakeFlow } from "./take-flow";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tagToken: string }>;
};

export default async function TagPage({ params }: PageProps) {
  const { tagToken } = await params;
  const member = await getSessionMember();

  if (!member) {
    return (
      <PageFrame member={null}>
        <section className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
          <div className="paper-card p-5 sm:p-7">
            <span className="eyebrow">nfc · přihlášení</span>
            <h1 className="display text-[2rem] sm:text-[2.4rem] mt-2 leading-tight">
              Skoro tam jsme,{" "}
              <span className="display-italic text-ember">kámo</span>.
            </h1>
            <p className="rubric mt-2 text-[0.96rem]">
              Tahle polička je jen pro pozvané. Po přihlášení tě vrátíme přímo
              sem.
            </p>
            <Link
              href={`/sign-in?from=nfc&next=${encodeURIComponent(`/t/${tagToken}`)}`}
              className="btn btn-ember btn-xl mt-5 w-full"
            >
              přihlásit se
            </Link>
          </div>
        </section>
      </PageFrame>
    );
  }

  const tag = await getTagSummary(tagToken);

  if (!tag) {
    return (
      <PageFrame member={member}>
        <section className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14 text-center">
          <div className="paper-card p-6">
            <span className="stamp stamp-closed mx-auto">neznámé</span>
            <h1 className="display text-[1.8rem] sm:text-[2.1rem] mt-3">
              Tenhle štítek neznám.
            </h1>
            <p className="rubric mt-2 text-[0.96rem]">
              Nikam nevede. Admin ho musí vygenerovat znovu.
            </p>
            <Link href="/" className="btn btn-ghost mt-5">
              zpět na přehled
            </Link>
          </div>
        </section>
      </PageFrame>
    );
  }

  const latestTake = await getLatestOwnTakeForTag(member.memberId, tagToken);
  const undoableId =
    latestTake && !latestTake.reversed ? latestTake.id : null;
  const undoDeadlineMs = latestTake
    ? latestTake.recorded_at.valueOf() + 2 * 60 * 1000
    : null;

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-md px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex items-baseline justify-between text-[0.7rem]">
          <span className="eyebrow">§ ťuk na poličku</span>
          <span className="tabular text-ink-faint">
            {tagToken.slice(0, 6).toUpperCase()}…
          </span>
        </div>

        <header className="mt-3">
          <div className="eyebrow truncate">{tag.shelf_name}</div>
          <h1 className="display text-[2.4rem] sm:text-[3.2rem] leading-[0.96] mt-1 break-words">
            {tag.product_name}
          </h1>
        </header>

        {tag.batch_id ? (
          <div className="mt-5 paper-card p-5 sm:p-6 relative overflow-hidden">
            <div className="grid grid-cols-3 gap-3 border-b border-ink pb-4">
              <Stat label="skladem">
                <span className="tabular text-[1.8rem] sm:text-[2rem] leading-none">
                  {tag.quantity_remaining}
                </span>
              </Stat>
              <Stat label="cena">
                <span className="tabular text-[1rem] sm:text-[1.1rem] leading-tight">
                  {formatCzk(tag.unit_price_minor ?? 0)}
                </span>
              </Stat>
              <Stat label="platil">
                <span className="text-[0.88rem] italic leading-tight block truncate">
                  {tag.buyer_name ?? "—"}
                </span>
              </Stat>
            </div>

            <TakeFlow
              tagToken={tagToken}
              unitPriceMinor={tag.unit_price_minor ?? 0}
              quantityRemaining={tag.quantity_remaining ?? 0}
              isOwnBatch={tag.buyer_member_id === member.memberId}
              initialUndoableId={undoableId}
              initialUndoDeadlineMs={undoableId ? undoDeadlineMs : null}
            />
          </div>
        ) : (
          <div className="mt-5 paper-card p-5 text-center">
            <span className="stamp stamp-closed mx-auto">bez dávky</span>
            <p className="rubric mt-3 text-[0.94rem]">
              Na poličce teď nic není. Kdo přinese další pack, nejdřív zapíše
              nákup.
            </p>
            <Link href="/shelves" className="btn btn-ghost mt-4">
              zapsat nákup
            </Link>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-[0.88rem]">
          <Link href="/" className="link-inline">
            ← doma
          </Link>
          <Link href="/account" className="link-inline">
            kam mi poslat →
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
