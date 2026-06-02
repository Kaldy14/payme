import { formatCzk } from "@/lib/format";
import { buildCzechAccount } from "@/lib/payme/payments";
import type { OpenCreditPartner, OpenDebtPartner } from "@/lib/payme/ui-queries";
import { PaymentQrBlock } from "@/components/payment-qr-block";
import {
  SettleCurrentCreditButton,
  SettleCurrentDebtButton,
} from "@/components/settle-current-credit-button";

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

export function OpenCredits({ credits }: { credits: OpenCreditPartner[] }) {
  if (credits.length === 0) return null;

  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="display text-[1.4rem] sm:text-[1.7rem] tracking-tight">
          K potvrzení
        </h2>
        <span className="eyebrow text-ink-faint">{credits.length}</span>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {credits.map((credit) => (
          <OpenCreditCard key={credit.debtor_member_id} credit={credit} />
        ))}
      </div>
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
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PaymentQrBlock
            dataUrl={debt.qr_code_data_url}
            message={debt.payment_message ?? debt.creditor_name}
            className="self-center sm:order-2 sm:self-start"
          />
          <div className="flex w-full flex-col gap-2 sm:order-1 sm:w-auto">
            <SettleCurrentDebtButton creditorMemberId={debt.creditor_member_id} />
            <span className="eyebrow text-ink-faint">
              označ po odeslání platby
            </span>
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

function OpenCreditCard({ credit }: { credit: OpenCreditPartner }) {
  return (
    <article className="paper-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">čeká od koho</div>
          <h3 className="display text-[1.7rem] sm:text-[2rem] leading-tight mt-1 break-words">
            {credit.debtor_name}
          </h3>
        </div>
        <div className="tabular text-[2rem] sm:text-[2.4rem] leading-none text-moss-deep whitespace-nowrap">
          {formatCzk(credit.amount_minor)}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2 border-y border-dashed border-rule py-3">
        {credit.products.map((product) => (
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

      <div className="mt-4">
        <SettleCurrentCreditButton debtorMemberId={credit.debtor_member_id} />
      </div>
    </article>
  );
}
