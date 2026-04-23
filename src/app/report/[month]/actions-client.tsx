"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closeMonthAction, markSettlementPaidAction } from "@/lib/actions";

export function CloseMonthButton({ monthKey }: { monthKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="btn btn-ember"
      >
        uzavřít měsíc
      </button>
    );
  }

  return (
    <div className="paper-card-flat border-l-4 border-ember p-3 text-left max-w-sm">
      <div className="eyebrow text-ember-deep">potvrdit uzavření</div>
      <p className="text-[0.88rem] mt-1 text-ink">
        Uzavřením <span className="tabular">{monthKey}</span> se uzamknou
        všechny dluhy. Každý věřitel musí mít vyplněný účet.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await closeMonthAction(monthKey);
                router.refresh();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Nepovedlo se uzavřít.",
                );
              }
            });
          }}
          className="btn btn-ember btn-sm"
        >
          {pending ? "uzavírám…" : "ano, uzavřít"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          disabled={pending}
          className="btn btn-ghost btn-sm"
        >
          zrušit
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[0.82rem] text-stamp-red break-words">
          {error}
        </div>
      )}
    </div>
  );
}

export function MarkPaidButton({
  settlementId,
  monthKey,
}: {
  settlementId: string;
  monthKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await markSettlementPaidAction(settlementId, monthKey);
              router.refresh();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Nepovedlo se označit.",
              );
            }
          });
        }}
        className="btn btn-sm"
      >
        {pending ? "označuji…" : "poslal/a jsem · zaplaceno"}
      </button>
      {error && (
        <div className="mt-2 text-[0.82rem] text-stamp-red break-words">
          {error}
        </div>
      )}
    </div>
  );
}
