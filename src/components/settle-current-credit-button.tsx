"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  markCurrentCreditPaidAction,
  markCurrentDebtPaidAction,
} from "@/lib/actions";

export function SettleCurrentCreditButton({
  debtorMemberId,
}: {
  debtorMemberId: string;
}) {
  return (
    <SettleButton
      action={() => markCurrentCreditPaidAction(debtorMemberId)}
      label="dorazilo - vyrovnáno"
      pendingLabel="označuji..."
    />
  );
}

export function SettleCurrentDebtButton({
  creditorMemberId,
}: {
  creditorMemberId: string;
}) {
  return (
    <SettleButton
      action={() => markCurrentDebtPaidAction(creditorMemberId)}
      label="mám zaplaceno"
      pendingLabel="označuji..."
      className="btn btn-ember btn-sm w-full sm:w-auto"
    />
  );
}

function SettleButton({
  action,
  label,
  pendingLabel,
  className = "btn btn-sm",
}: {
  action: () => Promise<unknown>;
  label: string;
  pendingLabel: string;
  className?: string;
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
              await action();
              router.refresh();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Nepovedlo se označit.",
              );
            }
          });
        }}
        className={className}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && (
        <div className="mt-2 text-[0.82rem] text-stamp-red break-words">
          {error}
        </div>
      )}
    </div>
  );
}
