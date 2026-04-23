"use client";

import { useActionState } from "react";

import { upsertPayoutAccountAction } from "@/lib/actions";
import type { PayoutAccountRow } from "@/lib/payme/ui-queries";

export function PayoutForm({ initial }: { initial: PayoutAccountRow | null }) {
  const [state, action, pending] = useActionState(upsertPayoutAccountAction, {} as { error?: string; ok?: string });

  return (
    <form action={action} className="paper-card p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">český bankovní účet</div>
        <span className="tabular text-[0.7rem] text-ink-faint">4 číslice banky</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[96px_1fr_96px]">
        <div className="field-row">
          <label className="label" htmlFor="accountPrefix">
            předčíslí
          </label>
          <input
            id="accountPrefix"
            name="accountPrefix"
            defaultValue={initial?.account_prefix ?? ""}
            placeholder="—"
            inputMode="numeric"
            className="input input-mono"
          />
        </div>
        <div className="field-row">
          <label className="label" htmlFor="accountNumber">
            číslo účtu
          </label>
          <input
            id="accountNumber"
            name="accountNumber"
            required
            defaultValue={initial?.account_number ?? ""}
            placeholder="1234567890"
            inputMode="numeric"
            className="input input-mono"
          />
        </div>
        <div className="field-row">
          <label className="label" htmlFor="bankCode">
            banka
          </label>
          <input
            id="bankCode"
            name="bankCode"
            required
            maxLength={4}
            pattern="\d{4}"
            defaultValue={initial?.bank_code ?? ""}
            placeholder="0300"
            inputMode="numeric"
            className="input input-mono"
          />
        </div>
      </div>

      <div className="field-row">
        <label className="label" htmlFor="accountName">
          majitel účtu (volitelné)
        </label>
        <input
          id="accountName"
          name="accountName"
          defaultValue={initial?.account_name ?? ""}
          className="input"
          placeholder="Jana Nováková"
        />
      </div>

      <div className="field-row">
        <label className="label" htmlFor="iban">
          IBAN (volitelné)
        </label>
        <input
          id="iban"
          name="iban"
          defaultValue={initial?.iban ?? ""}
          className="input input-mono"
          placeholder="CZ65 0800 0000 1920 0014 5399"
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-ember">
        {pending ? "ukládám…" : "uložit údaje"}
      </button>

      {state.error && (
        <div className="border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-3">
          <span className="eyebrow text-stamp-red">neuloženo</span>
          <div className="mt-1 text-[0.88rem] break-words">{state.error}</div>
        </div>
      )}
      {state.ok && (
        <div className="border-l-4 border-moss bg-[rgba(76,107,43,0.08)] p-3 text-[0.88rem]">
          <span className="eyebrow text-moss-deep">uloženo</span>
          <div className="mt-1">{state.ok}</div>
        </div>
      )}
    </form>
  );
}
