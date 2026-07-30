-- ============================================================
-- 001_schema.sql
-- DeltaForce Acc Management – Consolidated schema (single file)
-- ============================================================
-- Idempotent: safe to run on a fresh database or re-run on an
-- existing one. Tables use `if not exists`; functions/triggers
-- use `create or replace` / drop-guards. This supersedes the old
-- 001–008 migration chain.
-- ============================================================

-- ─── Clean Up Existing Data / Reset Database ──────────────────
drop table if exists holder_sessions cascade;
drop table if exists account_milestones cascade;
drop table if exists accounts cascade;
drop table if exists farmers cascade;
drop table if exists sources cascade;
drop type if exists account_status cascade;

-- ─── Enums ────────────────────────────────────────────────────
do $$ begin
  create type account_status as enum
    ('kho', 'dang_cay', 'done', 'da_giao_cho_ben_thu', 'da_nhan_tien');
exception when duplicate_object then null; end $$;

-- ─── Tables ───────────────────────────────────────────────────
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists farmers (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists accounts (
  id                  uuid primary key default gen_random_uuid(),
  username            text not null,
  password            text,
  source              uuid references sources(id),
  status              account_status not null default 'kho',
  position            integer not null default 0,
  current_holder      text,
  current_level       integer not null default 0,
  target_milestone_id uuid,
  amount_received     bigint check (amount_received is null or amount_received > 0),
  completed_at        timestamptz,
  delivered_at        timestamptz,
  paid_at             timestamptz,
  image_url           text,
  image_expires_at    timestamptz,
  added_by            text,
  version             integer not null default 0,
  updated_at          timestamptz not null default now()
);

create table if not exists account_milestones (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  level       integer not null,
  price       text not null,
  note        text,
  unique(account_id, level)
);

do $$ begin
  alter table accounts
    add constraint target_milestone_same_account
    foreign key (target_milestone_id) references account_milestones(id);
exception when duplicate_object then null; end $$;

create table if not exists holder_sessions (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  holder_name      text not null,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  handed_to        text,
  duration_seconds bigint
);

create unique index if not exists holder_sessions_one_open
  on holder_sessions(account_id) where ended_at is null;

-- ─── Row Level Security ───────────────────────────────────────
alter table accounts           enable row level security;
alter table account_milestones enable row level security;
alter table holder_sessions    enable row level security;
alter table sources            enable row level security;
alter table farmers            enable row level security;

do $$ begin
  create policy "authenticated accounts" on accounts
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated milestones" on account_milestones
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated sessions" on holder_sessions
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated sources" on sources
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated farmers" on farmers
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ─── Supabase Realtime ───────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table accounts;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table account_milestones;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table holder_sessions;
exception when others then null; end $$;

-- ─── updated_at touch trigger ─────────────────────────────────
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists accounts_updated_at on accounts;
create trigger accounts_updated_at
  before update on accounts
  for each row execute function touch_updated_at();

-- ─── Protection guards ────────────────────────────────────────
-- Protected columns are write-once via SECURITY DEFINER RPCs only.
-- `source` is intentionally NOT protected (plain uuid FK update).
create or replace function deltaforce_protect_accounts() returns trigger
language plpgsql as $$
begin
  if
    OLD.status is distinct from NEW.status or
    OLD.position is distinct from NEW.position or
    OLD.current_holder is distinct from NEW.current_holder or
    OLD.completed_at is distinct from NEW.completed_at or
    OLD.delivered_at is distinct from NEW.delivered_at or
    OLD.paid_at is distinct from NEW.paid_at or
    OLD.image_url is distinct from NEW.image_url or
    OLD.image_expires_at is distinct from NEW.image_expires_at or
    OLD.target_milestone_id is distinct from NEW.target_milestone_id or
    OLD.amount_received is distinct from NEW.amount_received or
    OLD.current_level is distinct from NEW.current_level
  then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'Protected columns may only be modified via DeltaForce RPCs'
        using errcode = 'P0003';
    end if;
  end if;
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists deltaforce_accounts_protect on accounts;
create trigger deltaforce_accounts_protect
  before update on accounts
  for each row execute function deltaforce_protect_accounts();

create or replace function deltaforce_protect_holder_sessions() returns trigger
language plpgsql as $$
begin
  if NEW.ended_at is null and exists (
    select 1 from holder_sessions
    where account_id = NEW.account_id and ended_at is null and id != NEW.id
  ) then
    raise exception 'Account already has an open session'
      using errcode = 'P0005';
  end if;
  return NEW;
end;
$$;

drop trigger if exists deltaforce_holder_sessions_protect on holder_sessions;
create trigger deltaforce_holder_sessions_protect
  before insert on holder_sessions
  for each row execute function deltaforce_protect_holder_sessions();

-- ─── RPC: move_account ────────────────────────────────────────
create or replace function move_account(
  p_account_id    uuid,
  p_next_holder   text,
  p_target_pos    integer,
  p_known_version integer
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare a accounts;
begin
  select * into a from accounts where id = p_account_id for update;
  if a.version != p_known_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if a.status not in ('kho', 'dang_cay') then
    raise exception 'invalid_transition' using errcode = 'P0002';
  end if;

  if exists (select 1 from holder_sessions where account_id = a.id and ended_at is null) then
    update holder_sessions
      set ended_at = now(),
          handed_to = p_next_holder,
          duration_seconds = extract(epoch from now() - started_at)::bigint
      where account_id = a.id and ended_at is null;
  end if;

  if nullif(trim(p_next_holder), '') is not null then
    insert into holder_sessions(account_id, holder_name)
      values (a.id, trim(p_next_holder));
  end if;

  update accounts
    set current_holder = nullif(trim(p_next_holder), ''),
        position       = p_target_pos,
        status         = (case
                           when nullif(trim(p_next_holder), '') is null then 'kho'
                           else 'dang_cay'
                         end)::account_status,
        version        = version + 1
    where id = a.id
    returning * into a;

  return a;
end;
$$;

-- ─── RPC: transition_account (FSM) ────────────────────────────
create or replace function transition_account(
  p_account_id          uuid,
  p_action              text,
  p_known_version       integer,
  p_current_level       integer  default null,
  p_target_milestone_id uuid     default null,
  p_amount_received     bigint   default null,
  p_note                text     default null
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare a accounts;
begin
  select * into a from accounts where id = p_account_id for update;
  if a.version != p_known_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;

  case p_action
  when 'update_level' then
    if a.status != 'dang_cay' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts set current_level = p_current_level, version = version + 1
      where id = a.id returning * into a;

  when 'done' then
    if a.status != 'dang_cay' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update holder_sessions
      set ended_at = now(),
          duration_seconds = extract(epoch from now() - started_at)::bigint
      where account_id = a.id and ended_at is null;
    update accounts set status = 'done', completed_at = now(), version = version + 1
      where id = a.id returning * into a;

  when 'deliver' then
    if a.status != 'done' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    if not exists (
      select 1 from account_milestones
      where id = p_target_milestone_id and account_id = a.id
    ) then
      raise exception 'invalid_milestone' using errcode = 'P0003';
    end if;
    update accounts
      set status              = 'da_giao_cho_ben_thu',
          delivered_at        = now(),
          image_expires_at    = now() + interval '3 days',
          target_milestone_id = p_target_milestone_id,
          version             = version + 1
      where id = a.id returning * into a;

  when 'pay' then
    if a.status != 'da_giao_cho_ben_thu' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    if coalesce(p_amount_received, 0) <= 0 then
      raise exception 'invalid_amount' using errcode = 'P0004';
    end if;
    update accounts
      set status          = 'da_nhan_tien',
          paid_at         = now(),
          amount_received = p_amount_received,
          version         = version + 1
      where id = a.id returning * into a;

  else
    raise exception 'invalid_transition' using errcode = 'P0002';
  end case;

  return a;
end;
$$;

-- ─── RPC: image helpers ───────────────────────────────────────
create or replace function upload_account_image(
  p_account_id    uuid,
  p_path          text,
  p_known_version integer
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare a accounts;
begin
  select * into a from accounts where id = p_account_id for update;
  if a.version != p_known_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  update accounts set image_url = p_path, version = version + 1
    where id = p_account_id returning * into a;
  return a;
end;
$$;

create or replace function clear_account_image(
  p_account_id    uuid,
  p_known_version integer
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare a accounts;
begin
  select * into a from accounts where id = p_account_id for update;
  if a.version != p_known_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  update accounts set image_url = null, image_expires_at = null, version = version + 1
    where id = p_account_id returning * into a;
  return a;
end;
$$;

-- ─── RPC: create_account_with_milestones ──────────────────────
-- source is uuid FK, price is text, and password IS persisted.
-- Drop the legacy text-based overload to avoid PostgREST ambiguity.
drop function if exists create_account_with_milestones(text, text, text, jsonb, text);

create or replace function create_account_with_milestones(
  p_source          uuid,
  p_username        text,
  p_password        text,
  p_milestones      jsonb,
  p_initial_holder  text default null,
  p_added_by        text default null
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare
  new_account_id uuid;
  milestone_rec  jsonb;
  level_val      integer;
  price_val      text;
  note_val       text;
  new_account    accounts;
begin
  insert into accounts (source, username, password, status, added_by)
    values (p_source, p_username, nullif(p_password, ''), 'kho', nullif(trim(p_added_by), ''))
    returning id into new_account_id;

  for milestone_rec in select * from jsonb_array_elements(p_milestones)
  loop
    level_val := (milestone_rec->>'level')::integer;
    price_val := milestone_rec->>'price';
    note_val  := milestone_rec->>'note';
    insert into account_milestones (account_id, level, price, note)
      values (new_account_id, level_val, price_val, note_val);
  end loop;

  if nullif(trim(p_initial_holder), '') is not null then
    insert into holder_sessions (account_id, holder_name)
      values (new_account_id, trim(p_initial_holder));
    update accounts
      set current_holder = trim(p_initial_holder),
          status          = 'dang_cay'
      where id = new_account_id;
  end if;

  select * into new_account from accounts where id = new_account_id;
  return new_account;
end;
$$;

-- ─── Storage policies (bucket: account-results, PRIVATE) ──────
do $$ begin
  create policy "storage_authenticated_select_account_results"
    on storage.objects for select to authenticated
    using ( bucket_id = 'account-results' );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "storage_authenticated_insert_account_results"
    on storage.objects for insert to authenticated
    with check ( bucket_id = 'account-results' );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "storage_authenticated_update_account_results"
    on storage.objects for update to authenticated
    using ( bucket_id = 'account-results' );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "storage_authenticated_delete_account_results"
    on storage.objects for delete to authenticated
    using ( bucket_id = 'account-results' );
exception when duplicate_object then null; end $$;

-- ─── Role permissions ─────────────────────────────────────────
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
alter default privileges in schema public grant all on functions to service_role;
