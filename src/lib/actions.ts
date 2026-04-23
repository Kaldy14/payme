"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/emails";
import { findMemberByAuthUserId } from "@/lib/payme/authz";
import {
  closeMonth,
  createBatch,
  createInvite,
  createProduct,
  createShelf,
  createTag,
  markSettlementPaid,
  replaceCurrentDrink,
  upsertPayoutAccount,
} from "@/lib/payme/commands";
import { PaymeError } from "@/lib/payme/errors";
import { listPendingInvites } from "@/lib/payme/ui-queries";

async function requireMemberFromCookies() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new PaymeError(401, "Nejdřív se přihlas.");
  }
  const member = await findMemberByAuthUserId(session.user.id);
  if (!member) {
    throw new PaymeError(403, "Tenhle účet není propojený s členem ChciPlech.");
  }
  return member;
}

function requireAdminRole(role: "admin" | "member") {
  if (role !== "admin") {
    throw new PaymeError(403, "Jen pro adminy.");
  }
}

type ActionState = { error?: string; ok?: string };

function toState(err: unknown): ActionState {
  if (err instanceof PaymeError) return { error: err.message };
  if (err instanceof Error) return { error: err.message };
  return { error: "Něco se pokazilo." };
}

// --------------- first-time setup (drink + hidden slot + tag) ---------------

export async function setupShelfAction(
  _prev: ActionState & { url?: string },
  formData: FormData,
): Promise<ActionState & { url?: string }> {
  try {
    const member = await requireMemberFromCookies();
    requireAdminRole(member.role);
    const productName = String(formData.get("productName") ?? "").trim();
    const unitLabel = String(formData.get("unitLabel") ?? "").trim();
    if (!productName) return { error: "Zadej název pití." };

    const product = await createProduct({
      name: productName,
      unitLabel: unitLabel || undefined,
    });
    const shelf = await createShelf({
      productId: product.id,
      name: productName,
    });
    const tag = await createTag({ shelfId: shelf.id });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/shelves");
    return { ok: "Pití a štítek jsou připravené.", url: tag.url };
  } catch (err) {
    return toState(err);
  }
}

// --------------- tag (re-mint) ---------------

export async function mintTagAction(
  _prev: ActionState & { url?: string },
  formData: FormData,
): Promise<ActionState & { url?: string }> {
  try {
    const member = await requireMemberFromCookies();
    requireAdminRole(member.role);
    const shelfId = String(formData.get("shelfId") ?? "").trim();
    if (!shelfId) return { error: "Chybí pití." };
    const result = await createTag({ shelfId });
    revalidatePath("/admin");
    return { ok: "Nový štítek vytvořen.", url: result.url };
  } catch (err) {
    return toState(err);
  }
}

// --------------- replace current drink ---------------

export async function replaceDrinkAction(
  _prev: ActionState & { url?: string },
  formData: FormData,
): Promise<ActionState & { url?: string }> {
  try {
    const member = await requireMemberFromCookies();
    requireAdminRole(member.role);
    const productName = String(formData.get("productName") ?? "").trim();
    const unitLabel = String(formData.get("unitLabel") ?? "").trim();
    if (!productName) return { error: "Zadej název pití." };

    const result = await replaceCurrentDrink(member, {
      name: productName,
      unitLabel: unitLabel || undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/shelves");
    return { ok: "Nové pití je připravené.", url: result.url };
  } catch (err) {
    return toState(err);
  }
}

// --------------- invites ---------------

export async function createInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const member = await requireMemberFromCookies();
    requireAdminRole(member.role);
    const email = String(formData.get("email") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const role = (String(formData.get("role") ?? "member") === "admin"
      ? "admin"
      : "member") as "admin" | "member";
    if (!email || !displayName) {
      return { error: "E-mail a jméno jsou povinné." };
    }
    const invite = await createInvite(member, { email, displayName, role });
    await sendInviteEmail({
      email: invite.email,
      displayName: invite.displayName,
      role: invite.role,
      invitedByName: member.display_name,
    });
    revalidatePath("/admin");
    return { ok: `${displayName} pozván(a) a e-mail je odeslaný.` };
  } catch (err) {
    return toState(err);
  }
}

export async function sendPendingInvitesAction(
  _prev: ActionState,
): Promise<ActionState> {
  try {
    void _prev;
    const member = await requireMemberFromCookies();
    requireAdminRole(member.role);

    const pendingInvites = await listPendingInvites();

    if (pendingInvites.length === 0) {
      return { ok: "Žádné čekající pozvánky k odeslání." };
    }

    const failedEmails: string[] = [];

    for (const invite of pendingInvites) {
      try {
        await sendInviteEmail({
          email: invite.email,
          displayName: invite.display_name,
          role: invite.role,
          invitedByName: member.display_name,
        });
      } catch {
        failedEmails.push(invite.email);
      }
    }

    revalidatePath("/admin");

    if (failedEmails.length > 0) {
      const sentCount = pendingInvites.length - failedEmails.length;
      return {
        error: `Odesláno ${sentCount} z ${pendingInvites.length}. Nepovedlo se: ${failedEmails.join(", ")}`,
      };
    }

    return { ok: `Odesláno ${pendingInvites.length} čekajících pozvánek.` };
  } catch (err) {
    return toState(err);
  }
}

// --------------- payout account ---------------

export async function upsertPayoutAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const member = await requireMemberFromCookies();
    const accountPrefix = String(formData.get("accountPrefix") ?? "").trim();
    const accountNumber = String(formData.get("accountNumber") ?? "").trim();
    const bankCode = String(formData.get("bankCode") ?? "").trim();
    const accountName = String(formData.get("accountName") ?? "").trim();
    const iban = String(formData.get("iban") ?? "").trim();
    if (!accountNumber) return { error: "Zadej číslo účtu." };
    if (!/^\d{4}$/.test(bankCode)) {
      return { error: "Kód banky musí mít 4 číslice." };
    }
    await upsertPayoutAccount(member.id, {
      accountPrefix: accountPrefix || undefined,
      accountNumber,
      bankCode,
      accountName: accountName || undefined,
      iban: iban || undefined,
    });
    revalidatePath("/account");
    return { ok: "Platební údaje uloženy." };
  } catch (err) {
    return toState(err);
  }
}

// --------------- batches ---------------

export async function createBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const member = await requireMemberFromCookies();
    const shelfId = String(formData.get("shelfId") ?? "").trim();
    const quantityTotal = Number(formData.get("quantityTotal"));
    const purchaseTotalCzk = Number(formData.get("purchaseTotalCzk"));
    const receiptNote = String(formData.get("receiptNote") ?? "").trim();
    if (!shelfId) return { error: "Chybí pití." };
    if (!Number.isInteger(quantityTotal) || quantityTotal < 1) {
      return { error: "Počet musí být kladné celé číslo." };
    }
    if (!(purchaseTotalCzk > 0)) {
      return { error: "Celková cena musí být větší než 0 Kč." };
    }
    const purchaseTotalMinor = Math.round(purchaseTotalCzk * 100);
    await createBatch(member, {
      shelfId,
      quantityTotal,
      purchaseTotalMinor,
      receiptNote: receiptNote || undefined,
    });
    revalidatePath("/shelves");
    revalidatePath("/");
    return { ok: "Dávka zapsána." };
  } catch (err) {
    return toState(err);
  }
}

// --------------- month close / mark paid ---------------

export async function closeMonthAction(monthKey: string) {
  const member = await requireMemberFromCookies();
  requireAdminRole(member.role);
  const result = await closeMonth(member, monthKey);
  revalidatePath(`/report/${monthKey}`);
  return result;
}

export async function markSettlementPaidAction(
  settlementId: string,
  monthKey: string,
) {
  const member = await requireMemberFromCookies();
  await markSettlementPaid(member, settlementId);
  revalidatePath(`/report/${monthKey}`);
  return { ok: true };
}

// --------------- sign out ---------------

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
