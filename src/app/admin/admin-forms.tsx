"use client";

import { useActionState, useState } from "react";

import {
  createInviteAction,
  mintTagAction,
  sendPendingInvitesAction,
  setupShelfAction,
} from "@/lib/actions";

type State = { error?: string; ok?: string };
type TagState = State & { url?: string };

function Status({ state }: { state: State }) {
  if (!state.error && !state.ok) return null;
  if (state.error) {
    return (
      <div className="border-l-4 border-stamp-red bg-[rgba(185,45,31,0.06)] p-2 text-[0.85rem]">
        <span className="eyebrow text-stamp-red">nepovedlo se</span>
        <div className="break-words">{state.error}</div>
      </div>
    );
  }
  return (
    <div className="border-l-4 border-moss bg-[rgba(76,107,43,0.08)] p-2 text-[0.85rem]">
      <span className="eyebrow text-moss-deep">hotovo</span>
      <div>{state.ok}</div>
    </div>
  );
}

// --- setup wizard for the one drink ---

export function SetupShelfForm() {
  const [state, action, pending] = useActionState<TagState, FormData>(
    setupShelfAction,
    {},
  );

  return (
    <form action={action} className="paper-card mt-3 p-4 sm:p-5 flex flex-col gap-3">
      <div className="eyebrow">nová parta · první nastavení</div>
      <div className="field-row">
        <label className="label" htmlFor="productName">
          pití
        </label>
        <input
          id="productName"
          name="productName"
          required
          className="input"
          placeholder="Club-Mate 0.5l"
        />
      </div>
      <div className="field-row">
        <label className="label" htmlFor="unitLabel">
          jednotka
        </label>
        <input
          id="unitLabel"
          name="unitLabel"
          className="input"
          placeholder="lahev"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-ember">
        {pending ? "nastavuji…" : "vytvořit pití a štítek"}
      </button>
      <Status state={state} />
      {state.url && (
        <div className="paper-card-flat p-3 break-all">
          <span className="eyebrow">NFC URL pro štítek</span>
          <div className="tabular text-[0.8rem] mt-1">{state.url}</div>
        </div>
      )}
    </form>
  );
}

// --- re-mint NFC tag ---

export function TagMinter({
  shelfId,
  currentToken,
}: {
  shelfId: string;
  currentToken: string | null;
}) {
  const [state, action, pending] = useActionState<TagState, FormData>(
    mintTagAction,
    {},
  );
  const [confirm, setConfirm] = useState(false);
  const shownUrl = state.url ?? (currentToken ? currentUrlFromToken(currentToken) : null);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {shownUrl && (
        <div className="paper-card-flat p-3 break-all">
          <span className="eyebrow">NFC URL</span>
          <div className="tabular text-[0.78rem] mt-1">{shownUrl}</div>
        </div>
      )}

      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="btn btn-ghost btn-sm"
        >
          vytvořit nový štítek
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="shelfId" value={shelfId} />
          <div className="eyebrow text-ember-deep">opravdu nový?</div>
          <p className="text-[0.85rem] text-ink-soft">
            Starý NFC štítek přestane fungovat. Přepiš ho novou URL.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-sm btn-ember">
              {pending ? "…" : "ano, vytvořit"}
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
          <Status state={state} />
        </form>
      )}
    </div>
  );
}

function currentUrlFromToken(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/t/${token}`;
  }
  return `/t/${token}`;
}

// --- invite form ---

export function InviteForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    createInviteAction,
    {},
  );
  return (
    <form action={action} className="paper-card p-4 flex flex-col gap-3">
      <div className="eyebrow">přidat parťáka</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field-row">
          <label className="label" htmlFor="i-email">
            e-mail
          </label>
          <input
            id="i-email"
            name="email"
            type="email"
            required
            className="input"
            placeholder="novacek@office.cz"
          />
        </div>
        <div className="field-row">
          <label className="label" htmlFor="i-name">
            jméno
          </label>
          <input
            id="i-name"
            name="displayName"
            required
            className="input"
            placeholder="Jana"
          />
        </div>
      </div>
      <div className="field-row">
        <label className="label" htmlFor="i-role">
          role
        </label>
        <select
          id="i-role"
          name="role"
          className="input appearance-none"
          defaultValue="member"
        >
          <option value="member">člen</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn btn-ember">
        {pending ? "pozývám…" : "pozvat"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function PendingInvitesForm({ pendingCount }: { pendingCount: number }) {
  const [state, action, pending] = useActionState<State, FormData>(
    sendPendingInvitesAction,
    {},
  );

  if (pendingCount <= 0) {
    return null;
  }

  return (
    <form action={action} className="paper-card-flat p-3 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="eyebrow">čekající pozvánky</div>
          <div className="text-[0.88rem] text-ink-soft mt-1">
            Už uložené pozvánky pošli všem najednou. Bez přepisování e-mailů.
          </div>
        </div>
        <span className="stamp stamp-closed shrink-0">{pendingCount}</span>
      </div>
      <button type="submit" disabled={pending} className="btn btn-sm btn-ghost">
        {pending ? "odesílám…" : "poslat čekající e-maily"}
      </button>
      <Status state={state} />
    </form>
  );
}
