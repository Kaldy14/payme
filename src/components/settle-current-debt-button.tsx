"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { markCurrentDebtPaidAction } from "@/lib/actions";

export function SettleCurrentDebtButton({
  creditorMemberId,
}: {
  creditorMemberId: string;
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
              await markCurrentDebtPaidAction(creditorMemberId);
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
        {pending ? "označuji..." : "poslal/a jsem - vyrovnáno"}
      </button>
      {error && (
        <div className="mt-2 text-[0.82rem] text-stamp-red break-words">
          {error}
        </div>
      )}
    </div>
  );
}
