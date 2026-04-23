import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { getSessionMember } from "@/lib/payme/session";
import { listShelves } from "@/lib/payme/ui-queries";
import { BatchForm } from "./batch-form";

export const dynamic = "force-dynamic";

export default async function ShelvesPage() {
  const member = await getSessionMember();
  if (!member) redirect("/sign-in?next=/shelves");

  const shelves = await listShelves();

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <span className="eyebrow">§ nová dávka</span>
        <h1 className="display text-[2.2rem] sm:text-[2.8rem] leading-tight mt-2">
          Zapiš <span className="display-italic text-ember">nákup</span>.
        </h1>
        <p className="rubric mt-2 text-[0.96rem]">
          Co jsi přinesl/a do kanceláře. Když aktuální dávka dojde, tahle se
          automaticky aktivuje.
        </p>

        <div className="mt-6">
          {shelves.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {shelves.map((shelf) => (
                <BatchForm key={shelf.id} shelf={shelf} />
              ))}
            </div>
          ) : (
            <div className="paper-card p-5 text-center">
              <span className="stamp stamp-closed mx-auto">bez pití</span>
              <p className="rubric mt-3 text-[0.96rem]">
                Pití ještě není nastavené.
              </p>
              {member.role === "admin" && (
                <Link href="/admin" className="btn btn-ghost mt-4">
                  přejít do správy
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
