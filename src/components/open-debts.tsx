import { formatCzk } from "@/lib/format";
import { buildCzechAccount } from "@/lib/payme/payments";
import type { OpenDebtPartner } from "@/lib/payme/ui-queries";
import { SettleCurrentDebtButton } from "@/components/settle-current-debt-button";

export function OpenDebts({ debts }: { debts: OpenDebtPartner[] }) {
  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
          Tvoje vyrovnání
        </h2>
        <span className="eyebrow text-ink-faint">{debts.length}</span>
      </div>

      {debts.length === 0 ? (
        <div className="paper-card-flat mt-3 p-4 text-ink-soft italic text-[0.94rem]">
          Teď nikomu nic nedlužíš.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {debts.map((debt) => (
            <OpenDebtCard key={debt.creditor_member_id} debt={debt} />
          ))}
        </div>
      )}
    </section>
  );
}

function OpenDebtCard({ debt }: { debt: OpenDebtPartner }) {
  const account =
    debt.account_number && debt.bank_code
      ? buildCzechAccount({
          accountPrefix: debt.account_prefix,
          accountNumber: debt.account_number,
          bankCode: debt.bank_code,
        })
      : null;

  return (
    <article className="paper-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">zaplať komu</div>
          <h3 className="display text-[1.7rem] sm:text-[2rem] leading-tight mt-1 break-words">
            {debt.creditor_name}
          </h3>
          <div className="tabular text-[0.78rem] text-ink-soft mt-1 break-all">
            {account ?? "chybí bankovní účet"}
          </div>
        </div>
        <div className="tabular text-[2rem] sm:text-[2.4rem] leading-none text-ember whitespace-nowrap">
          {formatCzk(debt.amount_minor)}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2 border-y border-dashed border-rule py-3">
        {debt.products.map((product) => (
          <li
            key={product.product_name}
            className="grid grid-cols-[1fr_auto] gap-3 text-[0.94rem]"
          >
            <span className="min-w-0 truncate">
              {product.units} {product.unit_label ?? "ks"} - {product.product_name}
            </span>
            <span className="tabular whitespace-nowrap">
              {formatCzk(product.amount_minor)}
            </span>
          </li>
        ))}
      </ul>

      {debt.qr_code_data_url ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <SettleCurrentDebtButton creditorMemberId={debt.creditor_member_id} />
            <span className="eyebrow text-ink-faint">
              označ, až pošleš peníze
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 self-center sm:self-start">
            <div className="paper-card-flat p-2 border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={debt.qr_code_data_url}
                alt={`QR platba - ${debt.payment_message ?? debt.creditor_name}`}
                className="h-[140px] w-[140px] sm:h-[170px] sm:w-[170px] block"
              />
            </div>
            <div className="eyebrow text-ink-faint">sken - SPD 1.0</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-3 text-[0.9rem]">
          <span className="eyebrow text-stamp-red">nejde zaplatit</span>
          <div className="mt-1">
            {debt.creditor_name} si musí doplnit bankovní účet.
          </div>
        </div>
      )}
    </article>
  );
}
