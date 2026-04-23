import type { PoolClient } from "pg";

import { firstRow, pool, withTransaction } from "@/lib/db/pool";
import { env } from "@/lib/env";
import type { MemberRecord } from "@/lib/payme/authz";
import { PaymeError } from "@/lib/payme/errors";
import { createId, createTagToken, normalizeEmail } from "@/lib/payme/ids";
import { buildSpdPayload } from "@/lib/payme/payments";

type CreateInviteInput = {
  email: string;
  displayName: string;
  role: "admin" | "member";
};

type CreateProductInput = {
  name: string;
  unitLabel?: string;
};

type CreateShelfInput = {
  productId: string;
  name: string;
  description?: string;
};

type ReplaceCurrentDrinkInput = {
  name: string;
  unitLabel?: string;
};

type PayoutAccountInput = {
  accountPrefix?: string;
  accountNumber: string;
  bankCode: string;
  accountName?: string;
  iban?: string;
};

type CreateBatchInput = {
  shelfId: string;
  buyerMemberId?: string;
  quantityTotal: number;
  purchaseTotalMinor: number;
  unitPriceMinor?: number;
  receiptNote?: string;
};

type CreateTakeInput = {
  tagToken: string;
  units: number;
  source: "nfc" | "manual";
  idempotencyKey: string;
  occurredAt?: string;
};

type SettlementAggregateRow = {
  debtor_member_id: string;
  creditor_member_id: string;
  amount_minor: number;
  creditor_name_snapshot: string;
  creditor_account_prefix_snapshot: string | null;
  creditor_account_number_snapshot: string;
  creditor_bank_code_snapshot: string;
};

function nowIso(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.valueOf())) {
    throw new PaymeError(400, "Neplatné datum.");
  }

  return date.toISOString();
}

async function memberCount(client: PoolClient) {
  const result = await client.query<{ count: string }>(
    "select count(*)::text as count from app_member",
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function invitedOrExistingMember(email: string, client: PoolClient | typeof pool) {
  const normalizedEmail = normalizeEmail(email);

  const member = await firstRow(
    await client.query<{ id: string }>(
      `
        select id
        from app_member
        where lower(email) = $1
        limit 1
      `,
      [normalizedEmail],
    ),
  );

  if (member) {
    return true;
  }

  const invite = await firstRow(
    await client.query<{ id: string }>(
      `
        select id
        from app_invite
        where lower(email) = $1
          and accepted_at is null
        limit 1
      `,
      [normalizedEmail],
    ),
  );

  return Boolean(invite);
}

export async function canBootstrapAuthUser() {
  const result = await pool.query<{ count: string }>(
    "select count(*)::text as count from app_member",
  );

  return Number(result.rows[0]?.count ?? "0") === 0;
}

export async function assertAuthEmailAllowed(email: string) {
  if (await canBootstrapAuthUser()) {
    return;
  }

  if (!(await invitedOrExistingMember(email, pool))) {
    throw new PaymeError(403, "Tento e-mail není pozván do ChciPlech.");
  }
}

export async function syncMemberAfterAuthUserCreate(input: {
  userId: string;
  email: string;
  name: string;
}) {
  await withTransaction(async (client) => {
    const normalizedEmail = normalizeEmail(input.email);

    const existingMember = firstRow(
      await client.query<{
        id: string;
        auth_user_id: string | null;
      }>(
        `
          select id, auth_user_id
          from app_member
          where lower(email) = $1
          limit 1
          for update
        `,
        [normalizedEmail],
      ),
    );

    const invite = firstRow(
      await client.query<{
        id: string;
        role: "admin" | "member";
        display_name: string;
      }>(
        `
          select id, role, display_name
          from app_invite
          where lower(email) = $1
            and accepted_at is null
          limit 1
          for update
        `,
        [normalizedEmail],
      ),
    );

    const totalMembers = await memberCount(client);

    if (existingMember) {
      await client.query(
        `
          update app_member
          set auth_user_id = $2,
              display_name = coalesce(nullif(display_name, ''), $3),
              updated_at = now()
          where id = $1
        `,
        [existingMember.id, input.userId, input.name],
      );
    } else if (invite) {
      const memberId = createId("member");

      await client.query(
        `
          insert into app_member (
            id,
            auth_user_id,
            email,
            display_name,
            role
          ) values ($1, $2, $3, $4, $5)
        `,
        [memberId, input.userId, normalizedEmail, invite.display_name, invite.role],
      );

      await client.query(
        `
          update app_invite
          set accepted_at = now()
          where id = $1
        `,
        [invite.id],
      );
    } else if (totalMembers === 0) {
      await client.query(
        `
          insert into app_member (
            id,
            auth_user_id,
            email,
            display_name,
            role
          ) values ($1, $2, $3, $4, 'admin')
        `,
        [createId("member"), input.userId, normalizedEmail, input.name || "Admin"],
      );
    } else {
      throw new PaymeError(403, "Pro tento účet neexistuje pozvánka.");
    }
  });
}

export async function createInvite(actor: MemberRecord, input: CreateInviteInput) {
  const normalizedEmail = normalizeEmail(input.email);

  return withTransaction(async (client) => {
    const existingMember = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_member
          where lower(email) = $1
          limit 1
        `,
        [normalizedEmail],
      ),
    );

    if (existingMember) {
      await client.query(
        `
          update app_member
          set display_name = $2,
              role = $3,
              updated_at = now()
          where id = $1
        `,
        [existingMember.id, input.displayName, input.role],
      );
    }

    const inviteId = createId("invite");

    await client.query(
      `
        insert into app_invite (
          id,
          email,
          display_name,
          role,
          invited_by_member_id
        ) values ($1, $2, $3, $4, $5)
        on conflict ((lower(email))) where accepted_at is null
        do update set
          display_name = excluded.display_name,
          role = excluded.role,
          invited_by_member_id = excluded.invited_by_member_id
      `,
      [inviteId, normalizedEmail, input.displayName, input.role, actor.id],
    );

    return {
      email: normalizedEmail,
      role: input.role,
      displayName: input.displayName,
    };
  });
}

export async function upsertPayoutAccount(
  memberId: string,
  input: PayoutAccountInput,
) {
  await pool.query(
    `
      insert into app_member_payout_account (
        member_id,
        account_prefix,
        account_number,
        bank_code,
        account_name,
        iban
      ) values ($1, $2, $3, $4, $5, $6)
      on conflict (member_id)
      do update set
        account_prefix = excluded.account_prefix,
        account_number = excluded.account_number,
        bank_code = excluded.bank_code,
        account_name = excluded.account_name,
        iban = excluded.iban,
        updated_at = now()
    `,
    [
      memberId,
      input.accountPrefix?.trim() || null,
      input.accountNumber.trim(),
      input.bankCode.trim(),
      input.accountName?.trim() || null,
      input.iban?.trim() || null,
    ],
  );

  return {
    ok: true,
  };
}

export async function createProduct(input: CreateProductInput) {
  const id = createId("product");

  await pool.query(
    `
      insert into app_product (id, name, unit_label)
      values ($1, $2, $3)
    `,
    [id, input.name.trim(), input.unitLabel?.trim() || null],
  );

  return {
    id,
    name: input.name.trim(),
    unitLabel: input.unitLabel?.trim() || null,
  };
}

export async function createShelf(input: CreateShelfInput) {
  const product = firstRow(
    await pool.query<{ id: string }>(
      `
        select id
        from app_product
        where id = $1
          and is_active = true
        limit 1
      `,
      [input.productId],
    ),
  );

  if (!product) {
    throw new PaymeError(404, "Produkt nenalezen.");
  }

  const id = createId("shelf");

  await pool.query(
    `
      insert into app_shelf (id, product_id, name, description)
      values ($1, $2, $3, $4)
    `,
    [id, input.productId, input.name.trim(), input.description?.trim() || null],
  );

  return {
    id,
  };
}

export async function createTag(input: { shelfId: string }) {
  const shelf = firstRow(
    await pool.query<{ id: string }>(
      `
        select id
        from app_shelf
        where id = $1
          and is_active = true
        limit 1
      `,
      [input.shelfId],
    ),
  );

  if (!shelf) {
    throw new PaymeError(404, "Polička nenalezena.");
  }

  const id = createId("tag");
  const token = createTagToken();

  await pool.query(
    `
      insert into app_tag (id, shelf_id, token)
      values ($1, $2, $3)
      on conflict (shelf_id)
      do update set
        token = excluded.token,
        is_active = true,
        archived_at = null
    `,
    [id, input.shelfId, token],
  );

  return {
    token,
    url: `${env.PAYME_BASE_URL.replace(/\/$/, "")}/t/${token}`,
  };
}

export async function replaceCurrentDrink(
  _actor: MemberRecord,
  input: ReplaceCurrentDrinkInput,
) {
  const drinkName = input.name.trim();
  const unitLabel = input.unitLabel?.trim() || null;

  if (!drinkName) {
    throw new PaymeError(400, "Zadej název pití.");
  }

  return withTransaction(async (client) => {
    const currentShelf = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_shelf
          where is_active = true
          order by created_at desc
          limit 1
          for update
        `,
      ),
    );

    if (!currentShelf) {
      throw new PaymeError(404, "Teď tu ještě není co měnit.");
    }

    const openBatch = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_batch
          where shelf_id = $1
            and status in ('active', 'queued')
          limit 1
          for update
        `,
        [currentShelf.id],
      ),
    );

    if (openBatch) {
      throw new PaymeError(
        409,
        "Nejdřív musí zmizet aktivní nebo čekající dávka aktuálního pití.",
      );
    }

    const productId = createId("product");
    const shelfId = createId("shelf");
    const tagId = createId("tag");
    const token = createTagToken();

    await client.query(
      `
        insert into app_product (id, name, unit_label)
        values ($1, $2, $3)
      `,
      [productId, drinkName, unitLabel],
    );

    await client.query(
      `
        update app_tag
        set is_active = false,
            archived_at = now()
        where shelf_id = $1
          and is_active = true
      `,
      [currentShelf.id],
    );

    await client.query(
      `
        update app_shelf
        set is_active = false,
            updated_at = now()
        where id = $1
      `,
      [currentShelf.id],
    );

    await client.query(
      `
        insert into app_shelf (id, product_id, name)
        values ($1, $2, $3)
      `,
      [shelfId, productId, drinkName],
    );

    await client.query(
      `
        insert into app_tag (id, shelf_id, token)
        values ($1, $2, $3)
      `,
      [tagId, shelfId, token],
    );

    return {
      productId,
      shelfId,
      token,
      url: `${env.PAYME_BASE_URL.replace(/\/$/, "")}/t/${token}`,
    };
  });
}

function resolveUnitPriceMinor(input: CreateBatchInput) {
  if (input.unitPriceMinor) {
    return input.unitPriceMinor;
  }

  if (input.purchaseTotalMinor % input.quantityTotal !== 0) {
    throw new PaymeError(
      400,
      "Celková částka se nedělí počtem beze zbytku. Zadej cenu za kus ručně.",
    );
  }

  return input.purchaseTotalMinor / input.quantityTotal;
}

export async function createBatch(actor: MemberRecord, input: CreateBatchInput) {
  const buyerMemberId =
    actor.role === "admin" && input.buyerMemberId ? input.buyerMemberId : actor.id;
  const unitPriceMinor = resolveUnitPriceMinor(input);

  return withTransaction(async (client) => {
    const shelf = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_shelf
          where id = $1
            and is_active = true
          limit 1
          for update
        `,
        [input.shelfId],
      ),
    );

    if (!shelf) {
      throw new PaymeError(404, "Polička nenalezena.");
    }

    const buyer = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_member
          where id = $1
          limit 1
        `,
        [buyerMemberId],
      ),
    );

    if (!buyer) {
      throw new PaymeError(404, "Kupující nenalezen.");
    }

    const activeBatch = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_batch
          where shelf_id = $1
            and status = 'active'
          limit 1
        `,
        [input.shelfId],
      ),
    );

    const batchId = createId("batch");
    const status = activeBatch ? "queued" : "active";
    const activatedAt = activeBatch ? null : new Date().toISOString();

    await client.query(
      `
        insert into app_batch (
          id,
          shelf_id,
          buyer_member_id,
          quantity_total,
          quantity_remaining,
          unit_price_minor,
          purchase_total_minor,
          status,
          receipt_note,
          activated_at
        ) values ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9)
      `,
      [
        batchId,
        input.shelfId,
        buyerMemberId,
        input.quantityTotal,
        unitPriceMinor,
        input.purchaseTotalMinor,
        status,
        input.receiptNote?.trim() || null,
        activatedAt,
      ],
    );

    return {
      id: batchId,
      status,
      unitPriceMinor,
    };
  });
}

export async function activateBatch(input: { shelfId: string; batchId: string }) {
  return withTransaction(async (client) => {
    const target = firstRow(
      await client.query<{ id: string; status: string }>(
        `
          select id, status
          from app_batch
          where id = $1
            and shelf_id = $2
          limit 1
          for update
        `,
        [input.batchId, input.shelfId],
      ),
    );

    if (!target) {
      throw new PaymeError(404, "Tuto dávku u toho pití nenajdu.");
    }

    if (target.status === "closed") {
      throw new PaymeError(400, "Uzavřenou dávku nelze znovu aktivovat.");
    }

    await client.query(
      `
        update app_batch
        set status = 'closed',
            closed_at = now(),
            updated_at = now()
        where shelf_id = $1
          and status = 'active'
          and id <> $2
      `,
      [input.shelfId, input.batchId],
    );

    await client.query(
      `
        update app_batch
        set status = 'active',
            activated_at = now(),
            updated_at = now()
        where id = $1
      `,
      [input.batchId],
    );

    return {
      id: input.batchId,
      status: "active" as const,
    };
  });
}

export async function createTake(actor: MemberRecord, input: CreateTakeInput) {
  return withTransaction(async (client) => {
    const existing = firstRow(
      await client.query<{ id: string; batch_id: string }>(
        `
          select id, batch_id
          from app_take_event
          where actor_member_id = $1
            and idempotency_key = $2
          limit 1
        `,
        [actor.id, input.idempotencyKey],
      ),
    );

    if (existing) {
      return {
        id: existing.id,
        duplicate: true,
      };
    }

    const activeContext = firstRow(
      await client.query<{
        shelf_id: string;
        batch_id: string;
        quantity_remaining: number;
      }>(
        `
          select
            s.id as shelf_id,
            b.id as batch_id,
            b.quantity_remaining
          from app_tag t
          join app_shelf s on s.id = t.shelf_id and s.is_active = true
          join app_batch b on b.shelf_id = s.id and b.status = 'active'
          where t.token = $1
            and t.is_active = true
          limit 1
          for update of b
        `,
        [input.tagToken],
      ),
    );

    if (!activeContext) {
      throw new PaymeError(404, "K tomuto štítku není aktivní dávka.");
    }

    if (activeContext.quantity_remaining < input.units) {
      throw new PaymeError(409, "Tolik kousků skladem není.");
    }

    await client.query(
      `
        update app_batch
        set quantity_remaining = quantity_remaining - $2,
            updated_at = now()
        where id = $1
      `,
      [activeContext.batch_id, input.units],
    );

    const takeId = createId("take");

    await client.query(
      `
        insert into app_take_event (
          id,
          actor_member_id,
          batch_id,
          shelf_id,
          delta_units,
          source,
          idempotency_key,
          occurred_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        takeId,
        actor.id,
        activeContext.batch_id,
        activeContext.shelf_id,
        input.units,
        input.source,
        input.idempotencyKey,
        nowIso(input.occurredAt),
      ],
    );

    return {
      id: takeId,
      duplicate: false,
    };
  });
}

export async function undoTake(actor: MemberRecord, takeEventId: string) {
  return withTransaction(async (client) => {
    const target = firstRow(
      await client.query<{
        id: string;
        batch_id: string;
        shelf_id: string;
        delta_units: number;
        recorded_at: Date;
      }>(
        `
          select
            e.id,
            e.batch_id,
            e.shelf_id,
            e.delta_units,
            e.recorded_at
          from app_take_event e
          where e.id = $1
            and e.actor_member_id = $2
            and e.delta_units > 0
          limit 1
          for update
        `,
        [takeEventId, actor.id],
      ),
    );

    if (!target) {
      throw new PaymeError(404, "Odběr nenalezen.");
    }

    if (Date.now() - target.recorded_at.valueOf() > 2 * 60 * 1000) {
      throw new PaymeError(409, "Okno pro vrácení uplynulo.");
    }

    const reversal = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_take_event
          where reverses_take_event_id = $1
          limit 1
        `,
        [target.id],
      ),
    );

    if (reversal) {
      throw new PaymeError(409, "Tento odběr už byl vrácen.");
    }

    const laterEvent = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_take_event
          where actor_member_id = $1
            and shelf_id = $2
            and id <> $3
            and recorded_at >= $4
          order by recorded_at asc
          limit 1
        `,
        [actor.id, target.shelf_id, target.id, target.recorded_at],
      ),
    );

    if (laterEvent) {
      throw new PaymeError(
        409,
        "Vrátit lze jen tvůj poslední odběr z tohoto pití.",
      );
    }

    await client.query(
      `
        update app_batch
        set quantity_remaining = quantity_remaining + $2,
            updated_at = now()
        where id = $1
      `,
      [target.batch_id, target.delta_units],
    );

    const undoId = createId("take");

    await client.query(
      `
        insert into app_take_event (
          id,
          actor_member_id,
          batch_id,
          shelf_id,
          delta_units,
          source,
          reverses_take_event_id,
          occurred_at,
          note
        ) values ($1, $2, $3, $4, $5, 'undo', $6, now(), 'Undo')
      `,
      [
        undoId,
        actor.id,
        target.batch_id,
        target.shelf_id,
        -target.delta_units,
        target.id,
      ],
    );

    return {
      id: undoId,
    };
  });
}

export async function closeMonth(actor: MemberRecord, monthKey: string) {
  return withTransaction(async (client) => {
    const existing = firstRow(
      await client.query<{ id: string }>(
        `
          select id
          from app_settlement_period
          where month_key = $1
          limit 1
        `,
        [monthKey],
      ),
    );

    if (existing) {
      return {
        id: existing.id,
        alreadyClosed: true,
      };
    }

    const missingPayout = await client.query<{ creditor_member_id: string }>(
      `
        with monthly_creditors as (
          select distinct b.buyer_member_id as creditor_member_id
          from app_take_event e
          join app_batch b on b.id = e.batch_id
          where to_char(e.occurred_at at time zone $2, 'YYYY-MM') = $1
            and e.actor_member_id <> b.buyer_member_id
            and e.delta_units <> 0
        )
        select mc.creditor_member_id
        from monthly_creditors mc
        left join app_member_payout_account pa on pa.member_id = mc.creditor_member_id
        where pa.member_id is null
      `,
      [monthKey, env.PAYME_OFFICE_TIMEZONE],
    );

    if (missingPayout.rows.length > 0) {
      throw new PaymeError(
        409,
        "Každý věřitel musí mít vyplněný účet, než měsíc uzavřeš.",
        missingPayout.rows,
      );
    }

    const periodId = createId("period");

    await client.query(
      `
        insert into app_settlement_period (
          id,
          month_key,
          office_timezone,
          closed_by_member_id
        ) values ($1, $2, $3, $4)
      `,
      [periodId, monthKey, env.PAYME_OFFICE_TIMEZONE, actor.id],
    );

    const aggregates = await client.query<SettlementAggregateRow>(
      `
        select
          e.actor_member_id as debtor_member_id,
          b.buyer_member_id as creditor_member_id,
          sum(e.delta_units * b.unit_price_minor)::int as amount_minor,
          creditor.display_name as creditor_name_snapshot,
          pa.account_prefix as creditor_account_prefix_snapshot,
          pa.account_number as creditor_account_number_snapshot,
          pa.bank_code as creditor_bank_code_snapshot
        from app_take_event e
        join app_batch b on b.id = e.batch_id
        join app_member creditor on creditor.id = b.buyer_member_id
        join app_member_payout_account pa on pa.member_id = creditor.id
        where to_char(e.occurred_at at time zone $2, 'YYYY-MM') = $1
          and e.actor_member_id <> b.buyer_member_id
        group by
          e.actor_member_id,
          b.buyer_member_id,
          creditor.display_name,
          pa.account_prefix,
          pa.account_number,
          pa.bank_code
        having sum(e.delta_units * b.unit_price_minor) > 0
      `,
      [monthKey, env.PAYME_OFFICE_TIMEZONE],
    );

    for (const row of aggregates.rows) {
      const message = `${env.PAYME_APP_NAME} ${monthKey}`;
      const qrPayload = buildSpdPayload({
        accountPrefix: row.creditor_account_prefix_snapshot,
        accountNumber: row.creditor_account_number_snapshot,
        bankCode: row.creditor_bank_code_snapshot,
        amountMinor: row.amount_minor,
        message,
      });

      await client.query(
        `
          insert into app_settlement_line (
            id,
            settlement_period_id,
            debtor_member_id,
            creditor_member_id,
            amount_minor,
            status,
            creditor_name_snapshot,
            creditor_account_prefix_snapshot,
            creditor_account_number_snapshot,
            creditor_bank_code_snapshot,
            payment_message,
            qr_payload
          ) values ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11)
        `,
        [
          createId("settlement"),
          periodId,
          row.debtor_member_id,
          row.creditor_member_id,
          row.amount_minor,
          row.creditor_name_snapshot,
          row.creditor_account_prefix_snapshot,
          row.creditor_account_number_snapshot,
          row.creditor_bank_code_snapshot,
          message,
          qrPayload,
        ],
      );
    }

    return {
      id: periodId,
      alreadyClosed: false,
      linesCreated: aggregates.rowCount,
    };
  });
}

export async function markSettlementPaid(actor: MemberRecord, settlementId: string) {
  const result = await pool.query(
    `
      update app_settlement_line
      set status = 'paid',
          paid_marked_at = now(),
          paid_by_member_id = $2
      where id = $1
        and debtor_member_id = $2
        and status = 'open'
      returning id
    `,
    [settlementId, actor.id],
  );

  if (result.rowCount === 0) {
    throw new PaymeError(404, "Otevřený dluh pro tebe neexistuje.");
  }

  return {
    id: settlementId,
    status: "paid" as const,
  };
}
