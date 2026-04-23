import { pool } from "@/lib/db/pool";
import { env } from "@/lib/env";

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
        where to_char(e.occurred_at at time zone $2, 'YYYY-MM') = to_char(now() at time zone $2, 'YYYY-MM')
          and e.actor_member_id <> b.buyer_member_id
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
