import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { getSessionMember } from "@/lib/payme/session";
import { getPayoutAccount } from "@/lib/payme/ui-queries";
import { PayoutForm } from "./payout-form";
import { PasskeyEnroll } from "./passkey-enroll";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const member = await getSessionMember();
  if (!member) redirect("/sign-in?next=/account");

  const account = await getPayoutAccount(member.memberId);

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-10">
        <span className="eyebrow">§ kam mi poslat</span>
        <h1 className="display text-[2rem] sm:text-[2.4rem] leading-tight mt-2">
          Kam ti mají{" "}
          <span className="display-italic text-ember">poslat prachy</span>?
        </h1>
        <p className="rubric mt-2 text-[0.96rem]">
          Český účet potřebujem, než ti začnou parťáci něco posílat. Zapečeme ho
          do QR kódů na konci měsíce.
        </p>

        <div className="paper-card mt-6 p-4">
          <div className="eyebrow">člen</div>
          <div className="display text-[1.4rem] mt-0.5 break-words">
            {member.displayName}
          </div>
          <div className="tabular text-[0.82rem] text-ink-soft break-all">
            {member.email}
          </div>
          <div className="mt-2 inline-flex">
            <span
              className={`stamp ${
                member.role === "admin" ? "stamp-active" : "stamp-closed"
              }`}
            >
              {member.role === "admin" ? "admin" : "člen"}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <PayoutForm initial={account} />
        </div>

        <div className="mt-5">
          <PasskeyEnroll />
        </div>
      </section>
    </PageFrame>
  );
}
