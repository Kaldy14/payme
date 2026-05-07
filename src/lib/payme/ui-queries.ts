import { pool } from "@/lib/db/pool";
import { env } from "@/lib/env";
import { buildSpdQrDataUrl, buildSpdPayload } from "@/lib/payme/payments";

export type ShelfOverview = {
  shelf_id: string;
  shelf_name: string;
  product_name: string;
  unit_label: string | null;
  description: string | null;
  active_batch_id: string | null;
  quantity_remaining: number | null;
  quantity_total: number | null;
  unit_price_minor: number | null;
  buyer_member_id: string | null;
  buyer_name: string | null;
  tag_token: string | null;
  queued_batches: number;
};

export async function listShelfOverviews(): Promise<ShelfOverview[]> {
  const result = await pool.query<ShelfOverview>(
    `
      select
        s.id as shelf_id,
        s.name as shelf_name,
        p.name as product_name,
        p.unit_label,
        s.description,
        b.id as active_batch_id,
        b.quantity_remaining,
        b.quantity_total,
        b.unit_price_minor,
        m.id as buyer_member_id,
        m.display_name as buyer_name,
        t.token as tag_token,
        coalesce((
          select count(*)
          from app_batch qb
          where qb.shelf_id = s.id and qb.status = 'queued'
        ), 0)::int as queued_batches
      from app_shelf s
      join app_product p on p.id = s.product_id
      left join app_batch b on b.shelf_id = s.id and b.status = 'active'
      left join app_member m on m.id = b.buyer_member_id
      left join app_tag t on t.shelf_id = s.id and t.is_active = true
      where s.is_active = true
      order by s.name asc
    `,
  );
  return result.rows;
}

export type ProductRow = {
  id: string;
  name: string;
  unit_label: string | null;
};

export async function listProducts(): Promise<ProductRow[]> {
  const result = await pool.query<ProductRow>(
    `
      select id, name, unit_label
      from app_product
      where is_active = true
      order by name asc
    `,
  );
  return result.rows;
}

export type ShelfRow = {
  id: string;
  name: string;
  product_name: string;
  unit_label: string | null;
};

export async function listShelves(): Promise<ShelfRow[]> {
  const result = await pool.query<ShelfRow>(
    `
      select s.id, s.name, p.name as product_name, p.unit_label
      from app_shelf s
      join app_product p on p.id = s.product_id
      where s.is_active = true
      order by s.name asc
    `,
  );
  return result.rows;
}

export type BatchRow = {
  id: string;
  shelf_id: string;
  product_name: string;
  unit_label: string | null;
  buyer_name: string;
  quantity_total: number;
  quantity_remaining: number;
  unit_price_minor: number;
  purchase_total_minor: number;
  status: "queued" | "active" | "closed";
  receipt_note: string | null;
  created_at: string;
  activated_at: string | null;
  closed_at: string | null;
  taken_units: number;
};

export async function listBatches(limit = 80): Promise<BatchRow[]> {
  const result = await pool.query<BatchRow>(
    `
      select
        b.id,
        b.shelf_id,
        p.name as product_name,
        p.unit_label,
        buyer.display_name as buyer_name,
        b.quantity_total,
        b.quantity_remaining,
        b.unit_price_minor,
        b.purchase_total_minor,
        b.status,
        b.receipt_note,
        b.created_at::text as created_at,
        b.activated_at::text as activated_at,
        b.closed_at::text as closed_at,
        coalesce(sum(e.delta_units), 0)::int as taken_units
      from app_batch b
      join app_shelf s on s.id = b.shelf_id
      join app_product p on p.id = s.product_id
      join app_member buyer on buyer.id = b.buyer_member_id
      left join app_take_event e on e.batch_id = b.id
      group by
        b.id,
        b.shelf_id,
        p.name,
        p.unit_label,
        buyer.display_name
      order by
        case b.status
          when 'active' then 0
          when 'queued' then 1
          else 2
        end,
        b.created_at desc
      limit $1
    `,
    [limit],
  );
  return result.rows;
}

export type ShelfStockTake = {
  member_id: string;
  member_name: string;
  units: number;
};

export type ShelfStockOverview = {
  shelf_id: string;
  product_name: string;
  unit_label: string | null;
  active_batch_id: string | null;
  quantity_remaining: number | null;
  quantity_total: number | null;
  unit_price_minor: number | null;
  buyer_member_id: string | null;
  buyer_name: string | null;
  queued_batches: number;
  takes: ShelfStockTake[];
};

type ShelfStockRow = Omit<ShelfStockOverview, "takes"> & {
  taker_member_id: string | null;
  taker_name: string | null;
  taken_units: number | null;
};

export async function listShelfStockOverviews(): Promise<ShelfStockOverview[]> {
  const result = await pool.query<ShelfStockRow>(
    `
      with active_takes as (
        select
          e.shelf_id,
          e.batch_id,
          e.actor_member_id,
          sum(e.delta_units)::int as taken_units
        from app_take_event e
        group by e.shelf_id, e.batch_id, e.actor_member_id
        having sum(e.delta_units) > 0
      )
      select
        s.id as shelf_id,
        p.name as product_name,
        p.unit_label,
        b.id as active_batch_id,
        b.quantity_remaining,
        b.quantity_total,
        b.unit_price_minor,
        buyer.id as buyer_member_id,
        buyer.display_name as buyer_name,
        coalesce((
          select count(*)
          from app_batch qb
          where qb.shelf_id = s.id and qb.status = 'queued'
        ), 0)::int as queued_batches,
        taker.id as taker_member_id,
        taker.display_name as taker_name,
        active_takes.taken_units
      from app_shelf s
      join app_product p on p.id = s.product_id
      left join app_batch b on b.shelf_id = s.id and b.status = 'active'
      left join app_member buyer on buyer.id = b.buyer_member_id
      left join active_takes on active_takes.shelf_id = s.id
        and active_takes.batch_id = b.id
        and active_takes.actor_member_id <> b.buyer_member_id
      left join app_member taker on taker.id = active_takes.actor_member_id
      where s.is_active = true
      order by s.name asc, active_takes.taken_units desc nulls last, taker.display_name asc
    `,
  );

  const shelves = new Map<string, ShelfStockOverview>();

  for (const row of result.rows) {
    let shelf = shelves.get(row.shelf_id);
    if (!shelf) {
      shelf = {
        shelf_id: row.shelf_id,
        product_name: row.product_name,
        unit_label: row.unit_label,
        active_batch_id: row.active_batch_id,
        quantity_remaining: row.quantity_remaining,
        quantity_total: row.quantity_total,
        unit_price_minor: row.unit_price_minor,
        buyer_member_id: row.buyer_member_id,
        buyer_name: row.buyer_name,
        queued_batches: row.queued_batches,
        takes: [],
      };
      shelves.set(row.shelf_id, shelf);
    }

    if (row.taker_member_id && row.taker_name && row.taken_units) {
      shelf.takes.push({
        member_id: row.taker_member_id,
        member_name: row.taker_name,
        units: row.taken_units,
      });
    }
  }

  return Array.from(shelves.values());
}

export type OpenDebtProduct = {
  product_name: string;
  unit_label: string | null;
  units: number;
  amount_minor: number;
};

export type OpenDebtPartner = {
  creditor_member_id: string;
  creditor_name: string;
  account_prefix: string | null;
  account_number: string | null;
  bank_code: string | null;
  amount_minor: number;
  payment_message: string | null;
  qr_code_data_url: string | null;
  products: OpenDebtProduct[];
};

type OpenDebtRow = {
  creditor_member_id: string;
  creditor_name: string;
  account_prefix: string | null;
  account_number: string | null;
  bank_code: string | null;
  product_name: string;
  unit_label: string | null;
  units: number;
  amount_minor: number;
};

export async function listOpenDebtsByProduct(
  memberId: string,
): Promise<OpenDebtPartner[]> {
  const result = await pool.query<OpenDebtRow>(
    `
      select
        b.buyer_member_id as creditor_member_id,
        creditor.display_name as creditor_name,
        pa.account_prefix,
        pa.account_number,
        pa.bank_code,
        p.name as product_name,
        p.unit_label,
        sum(e.delta_units)::int as units,
        sum(e.delta_units * b.unit_price_minor)::int as amount_minor
      from app_take_event e
      join app_batch b on b.id = e.batch_id
      join app_shelf s on s.id = e.shelf_id
      join app_product p on p.id = s.product_id
      join app_member creditor on creditor.id = b.buyer_member_id
      left join app_member_payout_account pa on pa.member_id = creditor.id
      left join lateral (
        select sm.settled_through
        from app_live_settlement_marker sm
        where sm.month_key = to_char(now() at time zone $2, 'YYYY-MM')
          and sm.debtor_member_id = e.actor_member_id
          and sm.creditor_member_id = b.buyer_member_id
        order by sm.settled_through desc
        limit 1
      ) paid on true
      where e.actor_member_id = $1
        and e.actor_member_id <> b.buyer_member_id
        and to_char(e.occurred_at at time zone $2, 'YYYY-MM') = to_char(now() at time zone $2, 'YYYY-MM')
        and e.occurred_at > coalesce(paid.settled_through, '-infinity'::timestamptz)
      group by
        b.buyer_member_id,
        creditor.display_name,
        pa.account_prefix,
        pa.account_number,
        pa.bank_code,
        p.name,
        p.unit_label
      having sum(e.delta_units) > 0
        and sum(e.delta_units * b.unit_price_minor) > 0
      order by creditor.display_name asc, p.name asc
    `,
    [memberId, env.PAYME_OFFICE_TIMEZONE],
  );

  const partners = new Map<string, OpenDebtPartner>();

  for (const row of result.rows) {
    let partner = partners.get(row.creditor_member_id);
    if (!partner) {
      partner = {
        creditor_member_id: row.creditor_member_id,
        creditor_name: row.creditor_name,
        account_prefix: row.account_prefix,
        account_number: row.account_number,
        bank_code: row.bank_code,
        amount_minor: 0,
        payment_message: null,
        qr_code_data_url: null,
        products: [],
      };
      partners.set(row.creditor_member_id, partner);
    }

    partner.amount_minor += row.amount_minor;
    partner.products.push({
      product_name: row.product_name,
      unit_label: row.unit_label,
      units: row.units,
      amount_minor: row.amount_minor,
    });
  }

  const monthResult = await pool.query<{ value: string }>(
    `select to_char(now() at time zone $1, 'YYYY-MM') as value`,
    [env.PAYME_OFFICE_TIMEZONE],
  );
  const monthKey = monthResult.rows[0]?.value ?? "";

  return Promise.all(
    Array.from(partners.values()).map(async (partner) => {
      if (!partner.account_number || !partner.bank_code) {
        return partner;
      }

      const paymentMessage = `${env.PAYME_APP_NAME} ${monthKey}`;
      const qrPayload = buildSpdPayload({
        accountPrefix: partner.account_prefix,
        accountNumber: partner.account_number,
        bankCode: partner.bank_code,
        amountMinor: partner.amount_minor,
        message: paymentMessage,
      });

      return {
        ...partner,
        payment_message: paymentMessage,
        qr_code_data_url: await buildSpdQrDataUrl(qrPayload),
      };
    }),
  );
}

export type InviteRow = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "member";
  accepted_at: Date | null;
  created_at: Date;
};

export async function listInvites(): Promise<InviteRow[]> {
  const result = await pool.query<InviteRow>(
    `
      select id, email, display_name, role, accepted_at, created_at
      from app_invite
      order by accepted_at nulls first, created_at desc
      limit 60
    `,
  );
  return result.rows;
}

export async function listPendingInvites(): Promise<InviteRow[]> {
  const result = await pool.query<InviteRow>(
    `
      select id, email, display_name, role, accepted_at, created_at
      from app_invite
      where accepted_at is null
      order by created_at desc
      limit 60
    `,
  );
  return result.rows;
}

export type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "member";
  has_payout_account: boolean;
};

export async function listMembers(): Promise<MemberRow[]> {
  const result = await pool.query<MemberRow>(
    `
      select
        m.id,
        m.email,
        m.display_name,
        m.role,
        (pa.member_id is not null) as has_payout_account
      from app_member m
      left join app_member_payout_account pa on pa.member_id = m.id
      order by m.display_name asc
    `,
  );
  return result.rows;
}

export type PayoutAccountRow = {
  account_prefix: string | null;
  account_number: string;
  bank_code: string;
  account_name: string | null;
  iban: string | null;
};

export async function getPayoutAccount(
  memberId: string,
): Promise<PayoutAccountRow | null> {
  const result = await pool.query<PayoutAccountRow>(
    `
      select account_prefix, account_number, bank_code, account_name, iban
      from app_member_payout_account
      where member_id = $1
      limit 1
    `,
    [memberId],
  );
  return result.rows[0] ?? null;
}

export type RecentTakeRow = {
  id: string;
  delta_units: number;
  occurred_at: Date;
  source: string;
  shelf_id: string;
  shelf_name: string;
  product_name: string;
  unit_label: string | null;
  unit_price_minor: number;
  reverses_take_event_id: string | null;
};

export async function listRecentTakes(
  memberId: string,
  limit = 12,
): Promise<RecentTakeRow[]> {
  const result = await pool.query<RecentTakeRow>(
    `
      select
        e.id,
        e.delta_units,
        e.occurred_at,
        e.source,
        s.id as shelf_id,
        s.name as shelf_name,
        p.name as product_name,
        p.unit_label,
        b.unit_price_minor,
        e.reverses_take_event_id
      from app_take_event e
      join app_shelf s on s.id = e.shelf_id
      join app_product p on p.id = s.product_id
      join app_batch b on b.id = e.batch_id
      where e.actor_member_id = $1
      order by e.occurred_at desc
      limit $2
    `,
    [memberId, limit],
  );
  return result.rows;
}

export type OpenMonthSummary = {
  owed_minor: number;
  owed_to_me_minor: number;
};

export async function getOpenMonthSummary(
  memberId: string,
): Promise<OpenMonthSummary> {
  const result = await pool.query<OpenMonthSummary>(
    `
      with monthly as (
        select
          e.actor_member_id as debtor,
          b.buyer_member_id as creditor,
          sum(e.delta_units * b.unit_price_minor)::int as amount
        from app_take_event e
        join app_batch b on b.id = e.batch_id
        left join lateral (
          select sm.settled_through
          from app_live_settlement_marker sm
          where sm.month_key = to_char(now() at time zone $2, 'YYYY-MM')
            and sm.debtor_member_id = e.actor_member_id
            and sm.creditor_member_id = b.buyer_member_id
          order by sm.settled_through desc
          limit 1
        ) paid on true
        where to_char(e.occurred_at at time zone $2, 'YYYY-MM') = to_char(now() at time zone $2, 'YYYY-MM')
          and e.actor_member_id <> b.buyer_member_id
          and e.occurred_at > coalesce(paid.settled_through, '-infinity'::timestamptz)
        group by e.actor_member_id, b.buyer_member_id
        having sum(e.delta_units * b.unit_price_minor) > 0
      )
      select
        coalesce(sum(case when debtor = $1 then amount else 0 end), 0)::int as owed_minor,
        coalesce(sum(case when creditor = $1 then amount else 0 end), 0)::int as owed_to_me_minor
      from monthly
    `,
    [memberId, env.PAYME_OFFICE_TIMEZONE],
  );
  return result.rows[0] ?? { owed_minor: 0, owed_to_me_minor: 0 };
}

export type LatestTagTake = {
  id: string;
  delta_units: number;
  recorded_at: Date;
  reversed: boolean;
};

export async function getLatestOwnTakeForTag(
  memberId: string,
  tagToken: string,
): Promise<LatestTagTake | null> {
  const result = await pool.query<LatestTagTake>(
    `
      select
        e.id,
        e.delta_units,
        e.recorded_at,
        exists (
          select 1 from app_take_event r
          where r.reverses_take_event_id = e.id
        ) as reversed
      from app_take_event e
      join app_shelf s on s.id = e.shelf_id
      join app_tag t on t.shelf_id = s.id
      where t.token = $1
        and e.actor_member_id = $2
        and e.delta_units > 0
      order by e.recorded_at desc
      limit 1
    `,
    [tagToken, memberId],
  );
  return result.rows[0] ?? null;
}

export type MonthlyReportLine = {
  id: string;
  amount_minor: number;
  status: "open" | "paid";
  paid_marked_at: Date | null;
  debtor_member_id: string;
  creditor_member_id: string;
  creditor_name_snapshot: string;
  creditor_account_prefix_snapshot: string | null;
  creditor_account_number_snapshot: string;
  creditor_bank_code_snapshot: string;
  payment_message: string;
  qr_payload: string;
};

export async function getSettlementPartnerName(
  memberId: string,
): Promise<string | null> {
  const result = await pool.query<{ display_name: string }>(
    `select display_name from app_member where id = $1 limit 1`,
    [memberId],
  );
  return result.rows[0]?.display_name ?? null;
}
