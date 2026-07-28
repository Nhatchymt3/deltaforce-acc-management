-- ============================================================
-- 007_fix_move_account_enum_cast.sql
-- DeltaForce: Fix "column status is of type account_status but
-- expression is of type text" when handing an account to a worker.
-- ============================================================
-- In move_account the status is set via a CASE expression. Postgres
-- resolves the bare string literals in a CASE to `text`, and cannot
-- implicitly assign text to the account_status enum column. Casting
-- the CASE result to account_status resolves the mismatch.

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
