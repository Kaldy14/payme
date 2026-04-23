"use client";

import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export function PasskeyEnroll() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  function enroll() {
    startTransition(async () => {
      try {
        const result = await authClient.passkey.addPasskey({});
        if (result?.error) {
          setStatus({
            kind: "error",
            message: result.error.message ?? "Nepovedlo se nastavit klíč.",
          });
          return;
        }
        setStatus({ kind: "ok" });
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Nepovedlo se nastavit klíč.",
        });
      }
    });
  }

  return (
    <div className="paper-card p-5 sm:p-6">
      <span className="eyebrow">přístupový klíč</span>
      <h2 className="display text-[1.3rem] mt-1">
        Přeskoč e-mail <span className="display-italic">příště</span>.
      </h2>
      <p className="mt-2 text-[0.92rem] text-ink-soft">
        Ulož si klíč a další přihlášení je jeden Face ID dotek.
      </p>
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        className="btn btn-ghost mt-4 w-full"
      >
        {pending ? "nastavuji…" : "nastavit klíč"}
      </button>
      {status.kind === "ok" && (
        <div className="mt-3 text-[0.85rem] text-moss-deep italic">
          Hotovo. Zkus se odhlásit a znovu přihlásit.
        </div>
      )}
      {status.kind === "error" && (
        <div className="mt-3 text-[0.85rem] text-stamp-red break-words">
          {status.message}
        </div>
      )}
    </div>
  );
}
