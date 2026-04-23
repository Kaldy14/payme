"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type Status =
  | { kind: "idle" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function SignInForm({
  nextPath,
  initialEmail,
}: {
  nextPath?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const callbackURL = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  async function handleMagic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const result = await authClient.signIn.magicLink({
          email: email.trim(),
          callbackURL,
        });
        if (result.error) {
          setStatus({
            kind: "error",
            message: result.error.message ?? "Nepovedlo se odeslat odkaz.",
          });
          return;
        }
        setStatus({ kind: "sent", email: email.trim() });
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Něco se pokazilo.",
        });
      }
    });
  }

  async function handlePasskey() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const result = await authClient.signIn.passkey();
        if (result?.error) {
          setStatus({
            kind: "error",
            message:
              result.error.message ??
              "Přístupový klíč se nepodařilo ověřit. Zkus magický odkaz.",
          });
          return;
        }
        router.push(callbackURL);
        router.refresh();
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Přístupový klíč nefunguje na tomto zařízení.",
        });
      }
    });
  }

  if (status.kind === "sent") {
    return (
      <div className="paper-card mt-6 p-5 sm:p-6">
        <div className="eyebrow">odkaz je na cestě</div>
        <div className="display text-[1.6rem] sm:text-[1.9rem] mt-2 leading-tight break-words">
          Zkontroluj{" "}
          <span className="display-italic text-ember">{status.email}</span>.
        </div>
        <p className="mt-3 text-[0.94rem] text-ink-soft">
          Otevři e-mail na stejném iPhonu, ze kterého budeš ťukat na polici.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="btn btn-ghost btn-sm mt-5"
        >
          použít jiný e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="paper-card mt-6 p-5 sm:p-6">
      <form onSubmit={handleMagic} className="flex flex-col gap-4">
        <div className="field-row">
          <label htmlFor="email" className="label">
            e-mail
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="ty@office.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-mono"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="btn btn-ember"
        >
          {pending ? "odesílám…" : "poslat magický odkaz"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-ink-faint">
        <div className="h-px flex-1 bg-rule" />
        <span className="eyebrow">nebo</span>
        <div className="h-px flex-1 bg-rule" />
      </div>

      <button
        type="button"
        onClick={handlePasskey}
        disabled={pending}
        className="btn btn-ghost w-full"
      >
        přihlásit klíčem (Face ID)
      </button>

      {status.kind === "error" && (
        <div className="mt-4 border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-3 text-[0.88rem]">
          <span className="eyebrow text-stamp-red">chyba</span>
          <div className="mt-1 break-words">{status.message}</div>
        </div>
      )}
    </div>
  );
}
