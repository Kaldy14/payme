"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatCzk } from "@/lib/format";

type Props = {
  tagToken: string;
  unitPriceMinor: number;
  quantityRemaining: number;
  isOwnBatch: boolean;
  initialUndoableId: string | null;
  initialUndoDeadlineMs: number | null;
};

type Recent = {
  id: string;
  units: number;
  amountMinor: number;
  takenAt: number;
};

type FlowStatus =
  | { kind: "idle" }
  | { kind: "submitting"; units: number }
  | { kind: "undoing" }
  | { kind: "success"; units: number }
  | { kind: "undone" }
  | { kind: "error"; message: string };

const UNDO_WINDOW_MS = 2 * 60 * 1000;

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function TakeFlow({
  tagToken,
  unitPriceMinor,
  quantityRemaining,
  isOwnBatch,
  initialUndoableId,
  initialUndoDeadlineMs,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<FlowStatus>({ kind: "idle" });
  const [recent, setRecent] = useState<Recent | null>(() =>
    initialUndoableId && initialUndoDeadlineMs
      ? {
          id: initialUndoableId,
          units: 1,
          amountMinor: unitPriceMinor,
          takenAt: initialUndoDeadlineMs - UNDO_WINDOW_MS,
        }
      : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!recent) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [recent]);

  const undoMsLeft = recent ? Math.max(0, recent.takenAt + UNDO_WINDOW_MS - now) : 0;
  const canUndo = recent !== null && undoMsLeft > 0;

  const submit = useCallback(
    async (units: number) => {
      if (pendingRef.current) return;
      if (units < 1) return;
      if (units > quantityRemaining) {
        setStatus({ kind: "error", message: "Tolik kousků skladem není." });
        return;
      }
      pendingRef.current = true;
      setStatus({ kind: "submitting", units });
      try {
        const idempotencyKey = randomKey();
        const res = await fetch("/api/takes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tagToken,
            units,
            source: "nfc",
            idempotencyKey,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Odběr selhal (${res.status}).`);
        }
        const body = (await res.json()) as { id: string };
        const takenAt = Date.now();
        setRecent({
          id: body.id,
          units,
          amountMinor: units * unitPriceMinor,
          takenAt,
        });
        setStatus({ kind: "success", units });
        if (navigator.vibrate) navigator.vibrate(12);
        router.refresh();
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Něco se pokazilo.",
        });
      } finally {
        pendingRef.current = false;
      }
    },
    [quantityRemaining, router, tagToken, unitPriceMinor],
  );

  const undo = useCallback(async () => {
    if (!recent || !canUndo) return;
    if (pendingRef.current) return;
    pendingRef.current = true;
    setStatus({ kind: "undoing" });
    try {
      const res = await fetch(`/api/takes/${recent.id}/undo`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Vrácení selhalo (${res.status}).`);
      }
      setRecent(null);
      setStatus({ kind: "undone" });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Vrácení selhalo.",
      });
    } finally {
      pendingRef.current = false;
    }
  }, [canUndo, recent, router]);

  const isPending = status.kind === "submitting" || status.kind === "undoing";

  if (quantityRemaining <= 0) {
    return (
      <div className="mt-5 text-center">
        <span className="stamp stamp-closed mx-auto">rozebráno</span>
        <p className="rubric mt-3 text-[0.94rem]">
          Někdo si vzal poslední. Čas přinést novou dávku.
        </p>
      </div>
    );
  }

  if (isOwnBatch) {
    return (
      <div className="mt-5 paper-card-flat p-4 border-l-4 border-amber text-[0.92rem] text-ink">
        <span className="eyebrow">vlastní dávka</span>
        <p className="mt-1">
          Tuhle dávku platíš ty. Odběry z vlastní dávky ti nevytvoří dluh. Pro
          pořádek si je ale můžeš zapsat.
        </p>
        <div className="mt-3">
          <TakeButtons
            onTake={submit}
            disabled={isPending}
            quantity={quantityRemaining}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <TakeButtons onTake={submit} disabled={isPending} quantity={quantityRemaining} />

      {status.kind === "submitting" && (
        <div className="text-center text-ink-soft tabular text-[0.84rem]">
          zapisuji +{status.units}…
        </div>
      )}

      {recent && status.kind !== "undoing" && (
        <div className="paper-card-flat border-l-4 border-ember p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow">právě vzato</div>
              <div className="display text-[1.6rem] sm:text-[1.8rem] leading-none mt-1">
                +{recent.units}
              </div>
            </div>
            <div className="tabular text-right">
              <div className="text-[1.15rem] sm:text-[1.3rem] text-ember">
                {formatCzk(recent.amountMinor)}
              </div>
              {canUndo && (
                <div className="text-[0.7rem] uppercase tracking-[0.2em] text-ink-faint mt-1">
                  vrátit · {Math.ceil(undoMsLeft / 1000)}s
                </div>
              )}
            </div>
          </div>
          {canUndo ? (
            <button
              type="button"
              onClick={undo}
              disabled={isPending}
              className="btn btn-ghost btn-sm mt-3 w-full"
            >
              ↶ vrátit odběr
            </button>
          ) : (
            <div className="eyebrow mt-3 text-ink-faint">
              okno pro vrácení zavřeno
            </div>
          )}
        </div>
      )}

      {status.kind === "undone" && !recent && (
        <div className="text-center text-moss-deep italic">
          Vráceno. Nic se neděje.
        </div>
      )}

      {status.kind === "error" && (
        <div className="border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-3">
          <span className="eyebrow text-stamp-red">nelze zapsat</span>
          <div className="mt-1 text-[0.9rem] break-words">{status.message}</div>
        </div>
      )}
    </div>
  );
}

function TakeButtons({
  onTake,
  disabled,
  quantity,
}: {
  onTake: (units: number) => void;
  disabled: boolean;
  quantity: number;
}) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => onTake(1)}
        disabled={disabled || quantity < 1}
        className="btn btn-ember btn-xl w-full py-5 text-[0.9rem]"
      >
        <span className="tabular text-[1.6rem] leading-none mr-1">+1</span>
        <span>ťukni pro kousek</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onTake(2)}
          disabled={disabled || quantity < 2}
          className="btn btn-ghost"
        >
          +2 vezmi dva
        </button>
        <button
          type="button"
          onClick={() => onTake(3)}
          disabled={disabled || quantity < 3}
          className="btn btn-ghost"
        >
          +3 vezmi tři
        </button>
      </div>
    </div>
  );
}
