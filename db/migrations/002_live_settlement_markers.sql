create table if not exists app_live_settlement_marker (
  id text primary key,
  month_key text not null,
  debtor_member_id text not null references app_member(id) on delete restrict,
  creditor_member_id text not null references app_member(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0),
  settled_through timestamptz not null,
  paid_at timestamptz not null default now(),
  creditor_name_snapshot text not null,
  creditor_account_prefix_snapshot text,
  creditor_account_number_snapshot text not null,
  creditor_bank_code_snapshot text not null,
  payment_message text not null,
  qr_payload text not null
);

create index if not exists app_live_settlement_marker_pair_idx
  on app_live_settlement_marker (
    month_key,
    debtor_member_id,
    creditor_member_id,
    settled_through desc
  );
