alter table app_settlement_line
  add column if not exists payment_code text,
  add column if not exists variable_symbol text,
  add column if not exists paid_source text check (paid_source in ('manual', 'bank_csv')),
  add column if not exists paid_note text;

with backfill as (
  select
    id,
    upper('CP' || substr(md5(id), 1, 8)) as code
  from app_settlement_line
  where payment_code is null
)
update app_settlement_line sl
set payment_code = backfill.code,
    variable_symbol = coalesce(sl.variable_symbol, '2026000001'),
    payment_message = case
      when sl.payment_message like backfill.code || ' %' then sl.payment_message
      else backfill.code || ' ' || sl.payment_message
    end
from backfill
where sl.id = backfill.id;

create unique index if not exists app_settlement_line_payment_code_idx
  on app_settlement_line (payment_code)
  where payment_code is not null;

create index if not exists app_settlement_line_payment_match_idx
  on app_settlement_line (payment_code, variable_symbol, amount_minor, status);

create table if not exists app_bank_csv_import (
  id text primary key,
  uploaded_by_member_id text not null references app_member(id) on delete restrict,
  account_member_id text references app_member(id) on delete set null,
  file_name text,
  file_sha256 text not null unique,
  row_count integer not null default 0,
  status text not null check (status in ('imported', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app_bank_transaction (
  id text primary key,
  first_import_id text not null references app_bank_csv_import(id) on delete restrict,
  last_import_id text not null references app_bank_csv_import(id) on delete restrict,
  first_row_number integer not null,
  last_row_number integer not null,
  transaction_fingerprint text not null unique,
  seen_count integer not null default 1 check (seen_count > 0),
  booked_at date,
  amount_minor integer not null,
  currency text not null,
  variable_symbol text,
  payment_code text,
  message text,
  counterparty_account text,
  counterparty_name text,
  raw_fields jsonb not null,
  match_status text not null check (
    match_status in ('matched', 'duplicate', 'unmatched', 'problem', 'ignored')
  ),
  problem_code text,
  matched_settlement_line_id text references app_settlement_line(id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_bank_transaction_one_match_per_line_idx
  on app_bank_transaction (matched_settlement_line_id)
  where matched_settlement_line_id is not null and match_status = 'matched';

create index if not exists app_bank_transaction_status_idx
  on app_bank_transaction (match_status, created_at desc);

create index if not exists app_bank_transaction_payment_code_idx
  on app_bank_transaction (payment_code)
  where payment_code is not null;
