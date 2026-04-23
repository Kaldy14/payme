import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { formatDateTime } from "@/lib/format";
import { getSessionMember } from "@/lib/payme/session";
import {
  listInvites,
  listMembers,
  listShelfOverviews,
} from "@/lib/payme/ui-queries";
import {
  InviteForm,
  PendingInvitesForm,
  SetupShelfForm,
  TagMinter,
} from "./admin-forms";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const member = await getSessionMember();
  if (!member) redirect("/sign-in?next=/admin");
  if (member.role !== "admin") {
    return (
      <PageFrame member={member}>
        <section className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14 text-center">
          <span className="stamp stamp-closed mx-auto">jen pro adminy</span>
          <h1 className="display text-[2rem] sm:text-[2.4rem] mt-4">
            Sem jen admin.
          </h1>
          <p className="rubric mt-2 text-[0.94rem]">
            Tahle sekce je pro správce skupiny.
          </p>
          <Link href="/" className="btn btn-ghost mt-5">
            zpět na přehled
          </Link>
        </section>
      </PageFrame>
    );
  }

  const [shelves, invites, members] = await Promise.all([
    listShelfOverviews(),
    listInvites(),
    listMembers(),
  ]);

  const shelf = shelves[0] ?? null;
  const pendingInviteCount = invites.filter((invite) => !invite.accepted_at).length;

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">§ kuchyň</span>
            <h1 className="display text-[2rem] sm:text-[2.4rem] leading-tight mt-1">
              Kuchyň.
            </h1>
            <p className="rubric mt-1 text-[0.96rem]">
              Polička, štítek, parta. Kostra, na které celé to stojí.
            </p>
          </div>
          <span className="stamp stamp-active whitespace-nowrap">admin</span>
        </div>

        {/* --- shelf panel --- */}
        <section className="mt-7">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <h2 className="display text-[1.4rem] sm:text-[1.6rem]">Polička</h2>
            <span className="eyebrow text-ink-faint">
              {shelf ? "nastavena" : "nenastaveno"}
            </span>
          </div>

          {shelf ? (
            <div className="paper-card mt-3 p-4 sm:p-5">
              <div className="eyebrow truncate">{shelf.product_name}</div>
              <div className="display text-[1.3rem] mt-0.5 break-words">
                {shelf.shelf_name}
              </div>
              <TagMinter shelfId={shelf.shelf_id} currentToken={shelf.tag_token} />
            </div>
          ) : (
            <SetupShelfForm />
          )}
        </section>

        {/* --- members --- */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <h2 className="display text-[1.4rem] sm:text-[1.6rem]">Parta</h2>
            <span className="eyebrow text-ink-faint">
              {members.length} lidí
            </span>
          </div>

          <ul className="mt-2 flex flex-col">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 border-b border-dashed border-rule py-2.5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{m.display_name}</span>
                  <span
                    className={`stamp shrink-0 ${
                      m.role === "admin" ? "stamp-active" : "stamp-closed"
                    }`}
                  >
                    {m.role === "admin" ? "admin" : "člen"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-[0.72rem]">
                  <span className="tabular text-ink-faint truncate">
                    {m.email}
                  </span>
                  <span
                    className={`eyebrow shrink-0 ${
                      m.has_payout_account ? "text-moss-deep" : "text-stamp-red"
                    }`}
                  >
                    {m.has_payout_account ? "účet ok" : "bez účtu"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <InviteForm />
          </div>

          {invites.length > 0 && (
            <>
              <div className="mt-4">
                <PendingInvitesForm pendingCount={pendingInviteCount} />
              </div>
              <div className="eyebrow mt-6 mb-2">pozvánky</div>
              <ul className="flex flex-col">
                {invites.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-col gap-1 border-b border-dashed border-rule py-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate">{i.display_name}</span>
                      <span
                        className={`eyebrow shrink-0 ${
                          i.accepted_at ? "text-moss-deep" : "text-ember-deep"
                        }`}
                      >
                        {i.accepted_at ? "přijato" : "čeká"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-[0.7rem] text-ink-faint">
                      <span className="tabular truncate">{i.email}</span>
                      <span className="tabular shrink-0">
                        {formatDateTime(i.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </section>
    </PageFrame>
  );
}
