"use client";

import { useActionState, useMemo, useState } from "react";

import { createBatchAction } from "@/lib/actions";
import type { ShelfRow } from "@/lib/payme/ui-queries";

export function BatchForm({ shelf }: { shelf: ShelfRow }) {
  const [state, action, pending] = useActionState(createBatchAction, {} as { error?: string; ok?: string });
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");

  const unitPrice = useMemo(() => {
    const q = Number(qty);
    const t = Number(total);
    if (!q || !t || q <= 0 || t <= 0) return null;
    return t / q;
  }, [qty, total]);

  const unit = shelf.unit_label ?? "ks";

  return (
    <form action={action} className="paper-card p-5 sm:p-6 flex flex-col gap-4">
      <input type="hidden" name="shelfId" value={shelf.id} />

      <div className="paper-card-flat p-3">
        <div className="eyebrow">polička</div>
        <div className="text-[1rem] mt-0.5 break-words">
          {shelf.name}{" "}
          <span className="rubric text-[0.88rem]">· {shelf.product_name}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field-row">
          <label className="label" htmlFor="quantityTotal">
            počet ({unit})
          </label>
          <input
            id="quantityTotal"
            name="quantityTotal"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="24"
            className="input input-mono"
            required
          />
        </div>

        <div className="field-row">
          <label className="label" htmlFor="purchaseTotalCzk">
            cena celkem (Kč)
          </label>
          <input
            id="purchaseTotalCzk"
            name="purchaseTotalCzk"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="648"
            className="input input-mono"
            required
          />
        </div>
      </div>

      <div className="paper-card-flat px-3 py-2 flex items-baseline justify-between">
        <span className="eyebrow">cena za kus</span>
        <span className="tabular text-[1.05rem]">
          {unitPrice !== null ? `${unitPrice.toFixed(2)} Kč` : "—"}
        </span>
      </div>

      <div className="field-row">
        <label className="label" htmlFor="receiptNote">
          poznámka (volitelná)
        </label>
        <input
          id="receiptNote"
          name="receiptNote"
          className="input"
          placeholder="Makro, platil jsem kartou"
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-ember">
        {pending ? "zapisuji…" : "zapsat dávku"}
      </button>

      {state.error && (
        <div className="border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-3">
          <span className="eyebrow text-stamp-red">nepovedlo se</span>
          <div className="mt-1 text-[0.9rem] break-words">{state.error}</div>
        </div>
      )}
      {state.ok && (
        <div className="border-l-4 border-moss bg-[rgba(76,107,43,0.08)] p-3 text-[0.9rem]">
          <span className="eyebrow text-moss-deep">zapsáno</span>
          <div className="mt-1">{state.ok}</div>
        </div>
      )}
    </form>
  );
}
