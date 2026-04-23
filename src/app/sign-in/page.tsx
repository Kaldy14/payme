import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { getSessionMember } from "@/lib/payme/session";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ next?: string; from?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const member = await getSessionMember();
  const params = (await searchParams) ?? {};

  if (member) {
    redirect(params.next ?? "/");
  }

  const fromNfc = params.from === "nfc";

  return (
    <PageFrame member={null}>
      <section className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <span className="eyebrow">§ přihlášení</span>
          <h1 className="display text-[2.2rem] sm:text-[2.8rem] leading-tight mt-2">
            Přihlas se{" "}
            <span className="display-italic text-ember">magickým odkazem</span>.
          </h1>
          <p className="rubric mt-2 text-[0.98rem]">
            Pošleme ti e-mail s jedním klikem. Poprvé si můžeš rovnou nastavit i
            přístupový klíč (Face ID).
          </p>
          {fromNfc && (
            <div className="paper-card-flat mt-4 p-3 border-l-4 border-ember">
              <span className="eyebrow">nfc · vrátíme tě</span>
              <div className="mt-1 text-[0.9rem]">
                Ťukl/a jsi na štítek. Po přihlášení tě vrátíme rovnou k odběru.
              </div>
            </div>
          )}
        </div>

        <SignInForm nextPath={params.next} />

        <ul className="mt-6 space-y-2 text-[0.86rem] text-ink-soft">
          <li>— Tvůj e-mail musí být pozvaný, nebo jsi první admin.</li>
          <li>— Odkaz funguje jen jednou.</li>
          <li>— Žádná hesla, nikdy.</li>
        </ul>
      </section>
    </PageFrame>
  );
}
