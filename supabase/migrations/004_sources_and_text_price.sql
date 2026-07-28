-- ============================================================
-- 004_sources_and_text_price.sql
-- DeltaForce: Dynamic Sources + Milestone Price as Text
-- ============================================================

-- 1. Create sources table
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  created_at  timestamptz not null default now()
);

-- RLS on sources
alter table sources enable row level security;

create policy "authenticated sources select" on sources
  for select to authenticated using (true);

create policy "authenticated sources insert" on sources
  for insert to authenticated with check (true);

create policy "authenticated sources update" on sources
  for update to authenticated using (true);

create policy "authenticated sources delete" on sources
  for delete to authenticated using (true);

-- Seed 3 sources
insert into sources (name) values
  ('Bên A'),
  ('Bên B'),
  ('C')
on conflict (name) do nothing;

-- 2. Change accounts.source: text check → uuid FK to sources
--    First backfill: match old text value to source id
update accounts
set source = s.id::text
from sources s
where accounts.source = s.name;

-- Drop the check constraint on accounts.source
alter table accounts
  drop constraint if exists accounts_source_check;

-- Add new column as uuid (temporary name to avoid conflict)
alter table accounts
  add column if not exists source_id uuid references sources(id);

-- Copy data
update accounts set source_id = source::uuid;

-- Drop old source column
alter table accounts drop column source;

-- Rename source_id to source
alter table accounts rename column source_id to source;

-- 3. Change account_milestones.price: bigint → text
--    Keep the data as-is (people entered VND numbers as bigint, now stored as text)
alter table accounts
  add column if not exists price_text text;

update account_milestones
set price_text = price::text;

alter table account_milestones drop column price;
alter table account_milestones rename column price_text to price;

-- 4. Fix the create_account_with_milestones function: price now text
create or replace function create_account_with_milestones(
  p_source          uuid,
  p_username        text,
  p_password        text,
  p_milestones      jsonb,
  p_initial_holder  text default null
) returns accounts
language plpgsql security definer set search_path = public
set deltaforce.rpc_call = 'true'
as $$
declare
  new_account_id uuid;
  milestone_rec  jsonb;
  level_val      integer;
  price_val      text;
  note_val       text;
  new_account    accounts;
begin
  insert into accounts (source, username, status)
    values (p_source, p_username, 'kho')
    returning id into new_account_id;

  for milestone_rec in select * from jsonb_array_elements(p_milestones)
  loop
    level_val := (milestone_rec->>'level')::integer;
    price_val := milestone_rec->>'price';  -- text now
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

-- 5. Update deltaforce_accounts_protect trigger: remove source from protected list
--    (source can now be updated via the RPC path since we moved to uuid FK)
create or replace function deltaforce_protect_accounts() returns trigger
language plpgsql
as $$
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
    if current_setting('deltaforce.rpc_call', true) != 'true' then
      raise exception 'Protected columns may only be modified via DeltaForce RPCs'
        using errcode = 'P0003';
    end if;
  end if;

  -- source is no longer protected (uuid FK allows normal updates)

  NEW.updated_at = now();
  return NEW;
end;
$$;

-- Recreate trigger (CREATE OR REPLACE on function does NOT update triggers)
drop trigger if exists deltaforce_accounts_protect on accounts;
create trigger deltaforce_accounts_protect
  before update on accounts
  for each row execute function deltaforce_protect_accounts();
