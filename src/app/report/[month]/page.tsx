import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/app-shell";
import { formatCzk, formatDateTime, formatMonthKey } from "@/lib/format";
import { buildCzechAccount } from "@/lib/payme/payments";
import { getMonthlyReport } from "@/lib/payme/queries";
import { monthKeySchema } from "@/lib/payme/schemas";
import { getSessionMember } from "@/lib/payme/session";
import { getSettlementPartnerName } from "@/lib/payme/ui-queries";
import { CloseMonthButton, MarkPaidButton } from "./actions-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ month: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { month } = await params;
  const member = await getSessionMember();

  if (!member) {
    redirect(`/sign-in?next=${encodeURIComponent(`/report/${month}`)}`);
  }

  const monthKey = monthKeySchema.safeParse(month);
  if (!monthKey.success) {
    return (
      <PageFrame member={member}>
        <section className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <h1 className="display text-[2rem]">Špatný měsíc.</h1>
          <p className="rubric mt-2 text-[0.94rem]">
            Přehledy používají klíč ve tvaru{" "}
            <span className="tabular">YYYY-MM</span> (např.{" "}
            <span className="tabular">2026-04</span>).
          </p>
          <Link href="/" className="btn btn-ghost mt-4">
            zpět na přehled
          </Link>
        </section>
      </PageFrame>
    );
  }

  const report = await getMonthlyReport(member.memberId, monthKey.data);
  const label = formatMonthKey(monthKey.data);

  const myDebts = report.lines.filter((l) => l.debtor_member_id === member.memberId);
  const myCredits = report.lines.filter(
    (l) => l.creditor_member_id === member.memberId,
  );

  const totalOwed = myDebts.reduce((acc, l) => acc + l.amount_minor, 0);
  const totalOwedToMe = myCredits.reduce((acc, l) => acc + l.amount_minor, 0);
  const openOwed = myDebts
    .filter((l) => l.status === "open")
    .reduce((acc, l) => acc + l.amount_minor, 0);
  const openOwedToMe = myCredits
    .filter((l) => l.status === "open")
    .reduce((acc, l) => acc + l.amount_minor, 0);

  return (
    <PageFrame member={member}>
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">konec měsíce</span>
            <h1 className="display text-[2.4rem] sm:text-[3.2rem] leading-[0.96] mt-1 break-words">
              {label.split(" ")[0]}{" "}
              <span className="display-italic text-ember">
                {label.split(" ")[1]}
              </span>
            </h1>
            <p className="rubric mt-1 text-[0.96rem]">
              Vše v korunách. QR kódy načti ve své bankovní appce.
            </p>
          </div>
          {report.period ? (
            <div className="paper-card-flat px-4 py-2.5 text-right">
              <div className="eyebrow">uzavřeno</div>
              <div className="tabular text-[0.82rem] mt-0.5">
                {formatDateTime(report.period.closed_at)}
              </div>
            </div>
          ) : (
            member.role === "admin" && (
              <CloseMonthButton monthKey={monthKey.data} />
            )
          )}
        </div>

        {!report.period ? (
          <OpenMonthState monthKey={monthKey.data} isAdmin={member.role === "admin"} />
        ) : (
          <>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <SummaryBar
                label="dlužíš"
                openMinor={openOwed}
                totalMinor={totalOwed}
                tone="debt"
              />
              <SummaryBar
                label="dluží ti"
                openMinor={openOwedToMe}
                totalMinor={totalOwedToMe}
                tone="credit"
              />
            </div>

            <div className="mt-10 flex flex-col gap-10">
              <DebtsColumn
                title="Dlužíš"
                emptyNote="Nikomu nic nedlužíš. Hezký měsíc."
                lines={await withPartner(myDebts, "creditor")}
                isDebt
                monthKey={monthKey.data}
              />
              <DebtsColumn
                title="Dluží ti"
                emptyNote="Nikdo ti nic nedluží."
                lines={await withPartner(myCredits, "debtor")}
                isDebt={false}
                monthKey={monthKey.data}
              />
            </div>
          </>
        )}

        <div className="mt-10 border-t border-ink pt-3 text-[0.72rem] text-ink-faint tabular flex flex-wrap gap-x-4 gap-y-1 uppercase tracking-[0.2em]">
          <span>přehled · {monthKey.data}</span>
          <span className="truncate">člen · {member.displayName.toLowerCase()}</span>
        </div>
      </section>
    </PageFrame>
  );
}

async function withPartner<
  T extends {
    debtor_member_id: string;
    creditor_member_id: string;
  },
>(lines: T[], which: "debtor" | "creditor") {
  const ids = Array.from(
    new Set(
      lines.map((l) => (which === "debtor" ? l.debtor_member_id : l.creditor_member_id)),
    ),
  );
  const names = await Promise.all(
    ids.map(async (id) => [id, (await getSettlementPartnerName(id)) ?? "—"] as const),
  );
  const nameMap = new Map(names);
  return lines.map((l) => ({
    ...l,
    partner_name:
      nameMap.get(
        which === "debtor" ? l.debtor_member_id : l.creditor_member_id,
      ) ?? "—",
  }));
}

function SummaryBar({
  label,
  openMinor,
  totalMinor,
  tone,
}: {
  label: string;
  openMinor: number;
  totalMinor: number;
  tone: "debt" | "credit";
}) {
  const pct = totalMinor > 0 ? Math.min(1, openMinor / totalMinor) : 0;
  const paid = totalMinor - openMinor;
  return (
    <div className="paper-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="tabular text-[0.78rem] text-ink-soft whitespace-nowrap">
          {formatCzk(paid)} / {formatCzk(totalMinor)}
        </span>
      </div>
      <div
        className={`tabular leading-none mt-2 text-[2rem] sm:text-[2.4rem] ${
          tone === "debt" ? "text-stamp-red" : "text-moss-deep"
        }`}
      >
        {formatCzk(openMinor)}
      </div>
      <div className="mt-3 h-[6px] w-full bg-paper-deep overflow-hidden relative">
        <div
          className={`h-full transition-all ${
            tone === "debt" ? "bg-stamp-red" : "bg-moss"
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

async function DebtsColumn({
  title,
  emptyNote,
  lines,
  isDebt,
  monthKey,
}: {
  title: string;
  emptyNote: string;
  lines: Array<
    Awaited<ReturnType<typeof getMonthlyReport>>["lines"][number] & {
      partner_name: string;
    }
  >;
  isDebt: boolean;
  monthKey: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.5rem] sm:text-[1.7rem] tracking-tight">
          {title}
        </h2>
        <span className="eyebrow text-ink-faint">{lines.length}</span>
      </div>
      {lines.length === 0 ? (
        <div className="paper-card-flat mt-3 p-4 text-ink-soft italic text-[0.94rem]">
          {emptyNote}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-5">
          {lines.map((line) => (
            <SettlementCard
              key={line.id}
              line={line}
              isDebt={isDebt}
              monthKey={monthKey}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SettlementCard({
  line,
  isDebt,
  monthKey,
}: {
  line: Awaited<ReturnType<typeof getMonthlyReport>>["lines"][number] & {
    partner_name: string;
  };
  isDebt: boolean;
  monthKey: string;
}) {
  const account = buildCzechAccount({
    accountPrefix: line.creditor_account_prefix_snapshot,
    accountNumber: line.creditor_account_number_snapshot,
    bankCode: line.creditor_bank_code_snapshot,
  });
  const isPaid = line.status === "paid";

  return (
    <li className="paper-card relative">
      {isPaid ? (
        <span className="stamp stamp-paid absolute top-3 right-3">zaplaceno</span>
      ) : isDebt ? (
        <span className="stamp stamp-active absolute top-3 right-3">splatné</span>
      ) : (
        <span className="stamp stamp-closed absolute top-3 right-3">otevřeno</span>
      )}

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <div className="eyebrow">{isDebt ? "zaplať" : "vybereš od"}</div>
          <div className="display text-[1.8rem] sm:text-[2.1rem] leading-tight mt-1 break-words">
            {line.partner_name}
          </div>
          <div className="tabular text-[0.78rem] text-ink-soft mt-1 break-all">
            {account}
          </div>
        </div>

        <div className="rule-hair pt-3">
          <div className="eyebrow">částka</div>
          <div
            className={`tabular text-[2.2rem] sm:text-[2.6rem] leading-none mt-1 ${
              isPaid ? "text-ink-faint line-through" : "text-ember"
            }`}
          >
            {formatCzk(line.amount_minor)}
          </div>
          <div className="tabular text-[0.76rem] text-ink-soft mt-1 break-all">
            zpráva: {line.payment_message}
          </div>
        </div>

        {isDebt && !isPaid && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <MarkPaidButton settlementId={line.id} monthKey={monthKey} />
              <span className="eyebrow text-ink-faint">
                označ, až pošleš peníze
              </span>
            </div>
            <QrBlock
              dataUrl={line.qr_code_data_url}
              message={line.payment_message}
            />
          </div>
        )}

        {isPaid && line.paid_marked_at && (
          <div className="eyebrow text-moss-deep">
            zaplaceno · {formatDateTime(line.paid_marked_at)}
          </div>
        )}
      </div>
    </li>
  );
}

function QrBlock({ dataUrl, message }: { dataUrl: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-1 self-center sm:self-start">
      <div className="paper-card-flat p-2 border-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={`QR platba — ${message}`}
          className="h-[140px] w-[140px] sm:h-[170px] sm:w-[170px] block"
        />
      </div>
      <div className="eyebrow text-ink-faint">sken · SPD 1.0</div>
    </div>
  );
}

function OpenMonthState({
  monthKey,
  isAdmin,
}: {
  monthKey: string;
  isAdmin: boolean;
}) {
  return (
    <div className="mt-8 paper-card p-5 sm:p-7 text-center relative overflow-hidden">
      <span className="stamp stamp-active mx-auto">zatím neuzavřeno</span>
      <h2 className="display text-[1.8rem] sm:text-[2.1rem] mt-3">
        Tento měsíc je ještě{" "}
        <span className="display-italic">otevřený</span>.
      </h2>
      <p className="rubric mt-2 text-[0.94rem]">
        Vyrovnání se vygeneruje, až admin měsíc uzavře. Do té doby se odběry
        sčítají.
      </p>
      {isAdmin && (
        <div className="mt-5 flex justify-center">
          <CloseMonthButton monthKey={monthKey} />
        </div>
      )}
    </div>
  );
}
