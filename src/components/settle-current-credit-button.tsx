"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { markCurrentCreditPaidAction } from "@/lib/actions";

export function SettleCurrentCreditButton({
  debtorMemberId,
}: {
  debtorMemberId: string;
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
              await markCurrentCreditPaidAction(debtorMemberId);
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
        {pending ? "označuji..." : "dorazilo - vyrovnáno"}
      </button>
      {error && (
        <div className="mt-2 text-[0.82rem] text-stamp-red break-words">
          {error}
        </div>
      )}
    </div>
  );
}
