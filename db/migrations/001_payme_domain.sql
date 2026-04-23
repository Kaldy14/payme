create table if not exists app_member (
  id text primary key,
  auth_user_id text unique,
  email text not null,
  display_name text not null,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_member_email_idx
  on app_member (lower(email));

create table if not exists app_member_payout_account (
  member_id text primary key references app_member(id) on delete cascade,
  account_prefix text,
  account_number text not null,
  bank_code text not null,
  account_name text,
  iban text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_invite (
  id text primary key,
  email text not null,
  display_name text not null,
  role text not null check (role in ('admin', 'member')),
  invited_by_member_id text references app_member(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists app_invite_pending_email_idx
  on app_invite (lower(email))
  where accepted_at is null;

create table if not exists app_product (
  id text primary key,
  name text not null,
  unit_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_shelf (
  id text primary key,
  product_id text not null references app_product(id) on delete restrict,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_tag (
  id text primary key,
  shelf_id text not null unique references app_shelf(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app_batch (
  id text primary key,
  shelf_id text not null references app_shelf(id) on delete restrict,
  buyer_member_id text not null references app_member(id) on delete restrict,
  quantity_total integer not null check (quantity_total > 0),
  quantity_remaining integer not null check (quantity_remaining >= 0),
  unit_price_minor integer not null check (unit_price_minor > 0),
  purchase_total_minor integer not null check (purchase_total_minor > 0),
  status text not null check (status in ('queued', 'active', 'closed')),
  receipt_note text,
  activated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_remaining <= quantity_total)
);

create unique index if not exists app_batch_active_shelf_idx
  on app_batch (shelf_id)
  where status = 'active';

create table if not exists app_take_event (
  id text primary key,
  actor_member_id text not null references app_member(id) on delete restrict,
  batch_id text not null references app_batch(id) on delete restrict,
  shelf_id text not null references app_shelf(id) on delete restrict,
  delta_units integer not null check (delta_units <> 0),
  source text not null check (source in ('nfc', 'manual', 'undo', 'correction')),
  idempotency_key text,
  reverses_take_event_id text references app_take_event(id) on delete restrict,
  note text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists app_take_event_idempotency_idx
  on app_take_event (actor_member_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists app_take_event_reverse_once_idx
  on app_take_event (reverses_take_event_id)
  where reverses_take_event_id is not null;

create index if not exists app_take_event_shelf_recorded_idx
  on app_take_event (shelf_id, recorded_at desc);

create table if not exists app_settlement_period (
  id text primary key,
  month_key text not null unique,
  office_timezone text not null,
  closed_by_member_id text not null references app_member(id) on delete restrict,
  closed_at timestamptz not null default now()
);

create table if not exists app_settlement_line (
  id text primary key,
  settlement_period_id text not null references app_settlement_period(id) on delete cascade,
  debtor_member_id text not null references app_member(id) on delete restrict,
  creditor_member_id text not null references app_member(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0),
  status text not null check (status in ('open', 'paid')),
  paid_marked_at timestamptz,
  paid_by_member_id text references app_member(id) on delete set null,
  creditor_name_snapshot text not null,
  creditor_account_prefix_snapshot text,
  creditor_account_number_snapshot text not null,
  creditor_bank_code_snapshot text not null,
  payment_message text not null,
  qr_payload text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists app_settlement_line_pair_idx
  on app_settlement_line (settlement_period_id, debtor_member_id, creditor_member_id);
