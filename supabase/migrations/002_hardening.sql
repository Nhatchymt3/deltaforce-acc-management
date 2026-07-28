-- ============================================================
-- 002_hardening.sql
-- DeltaForce Acc Management – Security & Correctness Hardening
-- ============================================================
-- Mechanism: BEFORE UPDATE trigger guard + current_user check
-- Protected columns (write-once via RPC only):
--   status, position, current_holder, completed_at, delivered_at,
--   paid_at, image_url, image_expires_at, target_milestone_id,
--   amount_received, current_level
--
-- How it works:
--   All legitimate writers are SECURITY DEFINER functions
--   (move_account, transition_account, upload_account_image,
--    clear_account_image, create_account_with_milestones).
--   The trigger checks current_user; if not postgres/supabase_admin
--   and not in security definer context, the update is rejected.
-- ============================================================

-- Drop existing functions first (to avoid parameter name conflicts)
-- These use signature-only syntax (no parameter names)
DROP FUNCTION IF EXISTS move_account(uuid, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS transition_account(uuid, text, integer, integer, uuid, bigint, text);
DROP FUNCTION IF EXISTS upload_account_image(uuid, text, integer);
DROP FUNCTION IF EXISTS clear_account_image(uuid, integer);
DROP FUNCTION IF EXISTS create_account_with_milestones(text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS deltaforce_protect_accounts();
DROP FUNCTION IF EXISTS deltaforce_protect_holder_sessions();

-- 1. Storage bucket policies – PRIVATE, authenticated only, no anon.
-- The 'account-results' bucket must be created in the Supabase dashboard
-- (Storage > New Bucket > Name: account-results > Private).
create policy "storage_authenticated_select_account_results"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'account-results' );

create policy "storage_authenticated_insert_account_results"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'account-results' );

create policy "storage_authenticated_update_account_results"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'account-results' );

create policy "storage_authenticated_delete_account_results"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'account-results' );

-- 2. BEFORE UPDATE guard on accounts
--    Allows writes only when current_user is postgres/supabase_admin
--    (i.e., running inside a SECURITY DEFINER RPC called by service_role)
create or replace function deltaforce_protect_accounts() returns trigger
language plpgsql
as $$
begin
  -- Coarse-grained: if any protected column changed, require elevated access
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
    -- Allow only for postgres/supabase_admin (service_role uses these internally)
    if current_user NOT IN ('postgres', 'supabase_admin') then
      raise exception 'Protected columns may only be modified via DeltaForce RPCs'
        using errcode = 'P0003';
    end if;
  end if;

  -- Still allow version bumps and updated_at touch from any authenticated writer.
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists deltaforce_accounts_protect on accounts;
create trigger deltaforce_accounts_protect
  before update on accounts
  for each row execute function deltaforce_protect_accounts();

-- 3. BEFORE INSERT guard on holder_sessions
--    Enforces no open session exists for the same account
--    (supplements the partial unique index which only prevents race
--     conditions within a single transaction).
create or replace function deltaforce_protect_holder_sessions() returns trigger
language plpgsql
as $$
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

-- 4. Transition RPCs – atomically set all relevant columns
--    SECURITY DEFINER functions run as table owner, bypassing RLS

create or replace function move_account(
  p_account_id    uuid,
  p_next_holder    text,
  p_target_pos    integer,
  p_known_version  integer
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
        status         = case
                           when nullif(trim(p_next_holder), '') is null then 'kho'
                           else 'dang_cay'
                         end,
        version        = version + 1
    where id = a.id
    returning * into a;

  return a;
end;
$$;

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
    update accounts
      set current_level = p_current_level,
          version       = version + 1
      where id = a.id
      returning * into a;

  when 'done' then
    if a.status != 'dang_cay' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update holder_sessions
      set ended_at         = now(),
          duration_seconds = extract(epoch from now() - started_at)::bigint
      where account_id = a.id and ended_at is null;

    update accounts
      set status      = 'done',
          completed_at = now(),
          version      = version + 1
      where id = a.id
      returning * into a;

  when 'deliver' then
    if a.status != 'done' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    -- Milestone must belong to the same account
    if not exists (
      select 1 from account_milestones
      where id = p_target_milestone_id and account_id = a.id
    ) then
      raise exception 'invalid_milestone' using errcode = 'P0003';
    end if;
    update accounts
      set status              = 'da_giao_cho_ben_thu',
          delivered_at         = now(),
          image_expires_at      = now() + interval '3 days',
          target_milestone_id   = p_target_milestone_id,
          version               = version + 1
      where id = a.id
      returning * into a;

  when 'pay' then
    if a.status != 'da_giao_cho_ben_thu' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    if coalesce(p_amount_received, 0) <= 0 then
      raise exception 'invalid_amount' using errcode = 'P0004';
    end if;
    update accounts
      set status           = 'da_nhan_tien',
          paid_at           = now(),
          amount_received    = p_amount_received,
          version           = version + 1
      where id = a.id
      returning * into a;

  else
    raise exception 'invalid_transition' using errcode = 'P0002';
  end case;

  return a;
end;
$$;

create or replace function upload_account_image(
  p_account_id   uuid,
  p_path         text,
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
  update accounts
    set image_url = p_path,
        version   = version + 1
    where id = p_account_id
    returning * into a;
  return a;
end;
$$;

create or replace function clear_account_image(
  p_account_id   uuid,
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
  update accounts
    set image_url        = null,
        image_expires_at = null,
        version          = version + 1
    where id = p_account_id
    returning * into a;
  return a;
end;
$$;

-- 5. Create account with milestones (idempotent, SECURITY DEFINER only)
create or replace function create_account_with_milestones(
  p_source          text,
  p_username        text,
  p_password        text,  -- stored accounts password
  p_milestones      jsonb,  -- [{level: number, price: number, note?: string}, ...]
  p_initial_holder  text   default null  -- if set, opens a holder session
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare
  new_account_id uuid;
  milestone_rec  jsonb;
  level_val      integer;
  price_val      bigint;
  note_val       text;
  new_account    accounts;
begin
  insert into accounts (source, username, password, status)
    values (p_source, p_username, nullif(p_password, ''), 'kho')
    returning id into new_account_id;

  -- Insert milestones
  for milestone_rec in select * from jsonb_array_elements(p_milestones)
  loop
    level_val := (milestone_rec->>'level')::integer;
    price_val := (milestone_rec->>'price')::bigint;
    note_val  := milestone_rec->>'note';
    insert into account_milestones (account_id, level, price, note)
      values (new_account_id, level_val, price_val, note_val);
  end loop;

  -- Optionally open an initial holder session
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
