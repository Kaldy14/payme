-- This app uses server-side Postgres connections only. Keep Supabase's
-- auto-generated Data API from exposing internal app and Better Auth tables.

revoke all on schema public from public;

revoke all privileges on all tables in schema public from public;

revoke all privileges on all sequences in schema public from public;

revoke all privileges on all functions in schema public from public;

alter default privileges in schema public
  revoke all privileges on tables from public;

alter default privileges in schema public
  revoke all privileges on sequences from public;

alter default privileges in schema public
  revoke all privileges on functions from public;

do $$
declare
  api_role text;
begin
  for api_role in
    select rolname
    from pg_roles
    where rolname in ('anon', 'authenticated')
  loop
    execute format('revoke all on schema public from %I', api_role);
    execute format(
      'revoke all privileges on all tables in schema public from %I',
      api_role
    );
    execute format(
      'revoke all privileges on all sequences in schema public from %I',
      api_role
    );
    execute format(
      'revoke all privileges on all functions in schema public from %I',
      api_role
    );
    execute format(
      'alter default privileges in schema public revoke all privileges on tables from %I',
      api_role
    );
    execute format(
      'alter default privileges in schema public revoke all privileges on sequences from %I',
      api_role
    );
    execute format(
      'alter default privileges in schema public revoke all privileges on functions from %I',
      api_role
    );
  end loop;
end $$;

do $$
declare
  table_record record;
begin
  for table_record in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      table_record.schema_name,
      table_record.table_name
    );
  end loop;
end $$;
