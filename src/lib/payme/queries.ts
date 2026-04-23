import { firstRow, pool } from "@/lib/db/pool";
import { buildSpdQrDataUrl } from "@/lib/payme/payments";

export async function getTagSummary(tagToken: string) {
  return firstRow(
    await pool.query<{
      tag_id: string;
      token: string;
      shelf_id: string;
      shelf_name: string;
      product_id: string;
      product_name: string;
      batch_id: string | null;
      quantity_remaining: number | null;
      unit_price_minor: number | null;
      buyer_member_id: string | null;
      buyer_name: string | null;
    }>(
      `
        select
          t.id as tag_id,
          t.token,
          s.id as shelf_id,
          s.name as shelf_name,
          p.id as product_id,
          p.name as product_name,
          b.id as batch_id,
          b.quantity_remaining,
          b.unit_price_minor,
          m.id as buyer_member_id,
          m.display_name as buyer_name
        from app_tag t
        join app_shelf s on s.id = t.shelf_id
        join app_product p on p.id = s.product_id
        left join app_batch b on b.shelf_id = s.id and b.status = 'active'
        left join app_member m on m.id = b.buyer_member_id
        where t.token = $1
          and t.is_active = true
          and s.is_active = true
        limit 1
      `,
      [tagToken],
    ),
  );
}

export async function getMonthlyReport(memberId: string, monthKey: string) {
  const period = firstRow(
    await pool.query<{
      id: string;
      month_key: string;
      office_timezone: string;
      closed_at: Date;
    }>(
      `
        select *
        from app_settlement_period
        where month_key = $1
        limit 1
      `,
      [monthKey],
    ),
  );

  if (!period) {
    return {
      period: null,
      lines: [],
    };
  }

  const result = await pool.query<{
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
  }>(
    `
      select *
      from app_settlement_line
      where settlement_period_id = $1
        and (debtor_member_id = $2 or creditor_member_id = $2)
      order by creditor_name_snapshot asc, amount_minor desc
    `,
    [period.id, memberId],
  );

  const lines = await Promise.all(
    result.rows.map(async (line) => ({
      ...line,
      qr_code_data_url: await buildSpdQrDataUrl(line.qr_payload),
    })),
  );

  return {
    period,
    lines,
  };
}
