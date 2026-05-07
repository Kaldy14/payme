"use client";

import { useActionState, useState } from "react";

import {
  archiveDrinkAction,
  createInviteAction,
  mintTagAction,
  sendPendingInvitesAction,
  setupShelfAction,
  updateBatchDrinkAction,
  updateDrinkAction,
} from "@/lib/actions";
import type {
  BatchRow,
  ShelfOverview,
  ShelfStockOverview,
} from "@/lib/payme/ui-queries";

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

// --- add drink + tag ---

export function AddDrinkForm() {
  const [state, action, pending] = useActionState<TagState, FormData>(
    setupShelfAction,
    {},
  );

  return (
    <form action={action} className="paper-card mt-3 p-4 sm:p-5 flex flex-col gap-3">
      <div className="eyebrow">nové pití</div>
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
        {pending ? "vytvářím…" : "vytvořit pití a štítek"}
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

// --- drinks + NFC tags ---

export function DrinkTagTable({
  shelves,
  stock,
  baseUrl,
}: {
  shelves: ShelfOverview[];
  stock: ShelfStockOverview[];
  baseUrl: string;
}) {
  const [openShelfId, setOpenShelfId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stockByShelf = new Map(stock.map((shelf) => [shelf.shelf_id, shelf]));

  if (shelves.length === 0) {
    return (
      <div className="paper-card p-5 text-center">
        <span className="stamp stamp-closed mx-auto">bez pití</span>
        <p className="rubric mt-3 text-[0.96rem]">
          Zatím tu není žádné pití ani štítek.
        </p>
      </div>
    );
  }

  async function copyUrl(url: string) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        copyTextFallback(url);
      }
      setToast("URL je ve schránce.");
    } catch {
      try {
        copyTextFallback(url);
        setToast("URL je ve schránce.");
      } catch {
        setToast("Kopírování se nepovedlo.");
      }
    }
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="paper-card relative overflow-hidden">
      {toast && (
        <div className="absolute right-3 top-3 z-10 border border-ink bg-paper px-3 py-2 text-[0.82rem] shadow-[3px_3px_0_0_var(--ink)]">
          <span className="eyebrow text-moss-deep">zkopírováno</span>
          <div>{toast}</div>
        </div>
      )}

      <div className="hidden sm:grid grid-cols-[1.2fr_2fr_0.8fr_auto] gap-3 border-b border-ink px-4 py-2 text-[0.68rem] uppercase tracking-[0.16em] text-ink-faint">
        <span>pití</span>
        <span>NFC URL</span>
        <span>stav</span>
        <span className="text-right">detail</span>
      </div>

      <div className="divide-y divide-dashed divide-rule">
        {shelves.map((shelf) => {
          const url = shelf.tag_token ? urlFromToken(baseUrl, shelf.tag_token) : null;
          const stockDetails = stockByShelf.get(shelf.shelf_id);
          const isOpen = openShelfId === shelf.shelf_id;

          return (
            <div key={shelf.shelf_id}>
              <div
                className="grid cursor-pointer gap-3 px-4 py-4 transition-colors hover:bg-[rgba(212,91,43,0.05)] sm:grid-cols-[1.2fr_2fr_0.8fr_auto] sm:items-center"
                onClick={() => setOpenShelfId(isOpen ? null : shelf.shelf_id)}
              >
                <div className="min-w-0">
                  <div className="eyebrow sm:hidden">pití</div>
                  <div className="display text-[1.18rem] leading-tight break-words">
                    {shelf.product_name}
                  </div>
                  <div className="mt-1 tabular text-[0.72rem] text-ink-faint">
                    {shelf.unit_label ?? "ks"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="eyebrow sm:hidden">NFC URL</div>
                  {url ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void copyUrl(url);
                      }}
                      className="tabular block max-w-full truncate text-left text-[0.78rem] underline decoration-dotted underline-offset-4 sm:text-[0.74rem]"
                      title="zkopírovat NFC URL"
                    >
                      {url}
                    </button>
                  ) : (
                    <span className="stamp stamp-closed">bez štítku</span>
                  )}
                </div>

                <div>
                  <div className="eyebrow sm:hidden">stav</div>
                  {shelf.active_batch_id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="stamp stamp-paid">aktivní</span>
                      <span className="tabular text-[0.76rem] text-ink-soft">
                        {shelf.quantity_remaining ?? 0}/{shelf.quantity_total ?? 0}
                      </span>
                    </div>
                  ) : (
                    <span className="stamp stamp-closed">bez dávky</span>
                  )}
                </div>

                <div className="justify-self-start sm:justify-self-end">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm min-w-[4.25rem]"
                    aria-expanded={isOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenShelfId(isOpen ? null : shelf.shelf_id);
                    }}
                  >
                    {isOpen ? "méně" : "detail"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <DrinkTagDetails
                  shelf={shelf}
                  stock={stockDetails}
                  currentUrl={url}
                  onCopyUrl={copyUrl}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrinkTagDetails({
  shelf,
  stock,
  currentUrl,
  onCopyUrl,
}: {
  shelf: ShelfOverview;
  stock: ShelfStockOverview | undefined;
  currentUrl: string | null;
  onCopyUrl: (url: string) => Promise<void>;
}) {
  const unit = shelf.unit_label ?? "ks";
  const remaining = stock?.quantity_remaining ?? shelf.quantity_remaining ?? 0;
  const total = stock?.quantity_total ?? shelf.quantity_total ?? 0;
  const unitPrice = stock?.unit_price_minor ?? shelf.unit_price_minor;
  const buyerName = stock?.buyer_name ?? shelf.buyer_name;

  return (
    <div className="bg-[rgba(139,126,105,0.08)] px-4 pb-4 pt-1">
      <div className="grid gap-4 border-t border-dashed border-rule pt-4 sm:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="paper-card-flat p-3">
              <div className="eyebrow">sklad</div>
              {stock?.active_batch_id ? (
                <div className="mt-1 tabular text-[1.25rem]">
                  {remaining}/{total} {unit}
                </div>
              ) : (
                <div className="mt-1 text-[0.95rem] italic text-ink-soft">
                  bez aktivní dávky
                </div>
              )}
            </div>
            <div className="paper-card-flat p-3">
              <div className="eyebrow">platí</div>
              <div className="mt-1 truncate text-[0.95rem]">
                {buyerName ?? "—"}
              </div>
              {unitPrice && (
                <div className="tabular text-[0.78rem] text-ink-soft">
                  {formatCzkLocal(unitPrice)}/{unit}
                </div>
              )}
            </div>
          </div>

          <div className="paper-card-flat p-3">
            <div className="eyebrow">kdo si vzal</div>
            {stock?.takes.length ? (
              <ul className="mt-2 flex flex-col gap-1.5">
                {stock.takes.map((take) => (
                  <li
                    key={take.member_id}
                    className="flex items-baseline justify-between gap-3 text-[0.92rem]"
                  >
                    <span className="truncate">{take.member_name}</span>
                    <span className="tabular whitespace-nowrap">
                      {take.units} {unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[0.9rem] italic text-ink-soft">
                Z téhle dávky si zatím nikdo cizí nevzal.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {currentUrl && (
            <button
              type="button"
              onClick={() => void onCopyUrl(currentUrl)}
              className="paper-card-flat p-3 text-left"
            >
              <span className="eyebrow">kopírovat URL</span>
              <span className="tabular mt-1 block break-all text-[0.78rem]">
                {currentUrl}
              </span>
            </button>
          )}
          <TagMinter
            shelfId={shelf.shelf_id}
            currentToken={shelf.tag_token}
            showUrl={false}
          />
          <EditDrinkForm shelf={shelf} />
          <ArchiveDrinkForm shelfId={shelf.shelf_id} />
        </div>
      </div>
    </div>
  );
}

function EditDrinkForm({ shelf }: { shelf: ShelfOverview }) {
  const [state, action, pending] = useActionState<State, FormData>(
    updateDrinkAction,
    {},
  );

  return (
    <form action={action} className="paper-card-flat p-3">
      <input type="hidden" name="shelfId" value={shelf.shelf_id} />
      <div className="eyebrow">upravit</div>
      <div className="mt-2 grid gap-2">
        <input
          name="productName"
          required
          defaultValue={shelf.product_name}
          className="input"
          aria-label="název pití"
        />
        <input
          name="unitLabel"
          defaultValue={shelf.unit_label ?? ""}
          className="input"
          aria-label="jednotka"
          placeholder="ks"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm mt-3">
        {pending ? "ukládám…" : "uložit"}
      </button>
      <div className="mt-2">
        <Status state={state} />
      </div>
    </form>
  );
}

function ArchiveDrinkForm({ shelfId }: { shelfId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(
    archiveDrinkAction,
    {},
  );
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="btn btn-ghost btn-sm text-stamp-red"
      >
        smazat
      </button>
    );
  }

  return (
    <form action={action} className="paper-card-flat border-stamp-red p-3">
      <input type="hidden" name="shelfId" value={shelfId} />
      <div className="eyebrow text-stamp-red">schovat pití?</div>
      <p className="mt-1 text-[0.85rem] text-ink-soft">
        Zmizí z aktuálních řádků. Historie zůstane.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-sm btn-ember">
          {pending ? "…" : "ano, smazat"}
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
      <div className="mt-2">
        <Status state={state} />
      </div>
    </form>
  );
}

export function TagMinter({
  shelfId,
  currentToken,
  showUrl = true,
}: {
  shelfId: string;
  currentToken: string | null;
  showUrl?: boolean;
}) {
  const [state, action, pending] = useActionState<TagState, FormData>(
    mintTagAction,
    {},
  );
  const [confirm, setConfirm] = useState(false);
  const shownUrl = state.url ?? (currentToken ? currentUrlFromToken(currentToken) : null);

  return (
    <div className="flex flex-col gap-3">
      {showUrl && shownUrl && (
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
          nová URL
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

function urlFromToken(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/t/${token}`;
}

function formatCzkLocal(minor: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function formatDateTimeLocal(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function copyTextFallback(text: string) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

// --- batches / stockups ---

export function BatchTable({
  batches,
  shelves,
}: {
  batches: BatchRow[];
  shelves: ShelfOverview[];
}) {
  const [editBatchId, setEditBatchId] = useState<string | null>(null);

  if (batches.length === 0) {
    return (
      <div className="paper-card p-5 text-center">
        <span className="stamp stamp-closed mx-auto">bez dávek</span>
        <p className="rubric mt-3 text-[0.96rem]">
          Zatím není zapsaný žádný nákup.
        </p>
      </div>
    );
  }

  return (
    <div className="paper-card overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_auto] gap-3 border-b border-ink px-4 py-2 text-[0.68rem] uppercase tracking-[0.16em] text-ink-faint">
        <span>dávka</span>
        <span>platil/a</span>
        <span>stav</span>
        <span>zapsáno</span>
        <span className="text-right">oprava</span>
      </div>

      <div className="divide-y divide-dashed divide-rule">
        {batches.map((batch) => {
          const isEditing = editBatchId === batch.id;
          const unit = batch.unit_label ?? "ks";

          return (
            <div key={batch.id} className="px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="eyebrow sm:hidden">dávka</div>
                  <div className="display text-[1.08rem] leading-tight break-words">
                    {batch.product_name}
                  </div>
                  <div className="mt-1 tabular text-[0.74rem] text-ink-soft">
                    {batch.quantity_remaining}/{batch.quantity_total} {unit} ·{" "}
                    {formatCzkLocal(batch.unit_price_minor)}/{unit}
                  </div>
                  {batch.receipt_note && (
                    <div className="mt-1 truncate text-[0.78rem] italic text-ink-faint">
                      {batch.receipt_note}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="eyebrow sm:hidden">platil/a</div>
                  <div className="truncate text-[0.92rem]">{batch.buyer_name}</div>
                </div>

                <div>
                  <div className="eyebrow sm:hidden">stav</div>
                  <BatchStatus status={batch.status} />
                  {batch.taken_units > 0 && (
                    <div className="mt-1 tabular text-[0.7rem] text-ink-faint">
                      odebráno {batch.taken_units}
                    </div>
                  )}
                </div>

                <div>
                  <div className="eyebrow sm:hidden">zapsáno</div>
                  <div className="tabular text-[0.74rem] text-ink-soft">
                    {formatDateTimeLocal(batch.created_at)}
                  </div>
                </div>

                <div className="justify-self-start sm:justify-self-end">
                  {batch.status === "closed" ? (
                    <span className="eyebrow text-ink-faint">zamčeno</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditBatchId(isEditing ? null : batch.id)}
                      className="btn btn-ghost btn-sm"
                      aria-expanded={isEditing}
                    >
                      {isEditing ? "zavřít" : "upravit"}
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <BatchDrinkForm
                  batch={batch}
                  shelves={shelves}
                  onCancel={() => setEditBatchId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatchDrinkForm({
  batch,
  shelves,
  onCancel,
}: {
  batch: BatchRow;
  shelves: ShelfOverview[];
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    updateBatchDrinkAction,
    {},
  );

  return (
    <form
      action={action}
      className="mt-4 paper-card-flat bg-[rgba(139,126,105,0.08)] p-3"
    >
      <input type="hidden" name="batchId" value={batch.id} />
      <div className="eyebrow">přesunout dávku</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="field-row">
          <label className="label" htmlFor={`batch-shelf-${batch.id}`}>
            správné pití
          </label>
          <select
            id={`batch-shelf-${batch.id}`}
            name="shelfId"
            className="input appearance-none"
            defaultValue={batch.shelf_id}
          >
            {shelves.map((shelf) => (
              <option key={shelf.shelf_id} value={shelf.shelf_id}>
                {shelf.product_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn btn-sm btn-ember">
            {pending ? "ukládám…" : "uložit"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn btn-ghost btn-sm"
          >
            zrušit
          </button>
        </div>
      </div>
      <div className="mt-2">
        <Status state={state} />
      </div>
    </form>
  );
}

function BatchStatus({ status }: { status: BatchRow["status"] }) {
  if (status === "active") {
    return <span className="stamp stamp-paid">aktivní</span>;
  }
  if (status === "queued") {
    return <span className="stamp stamp-active">čeká</span>;
  }
  return <span className="stamp stamp-closed">uzavřeno</span>;
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
