-- ============================================================
-- 003_rpc_tests.sql
-- DeltaForce Acc Management – RPC FSM / Version Tests
-- ============================================================
-- WARNING: This file is for MANUAL VERIFICATION ONLY.
-- It is commented out so it does not run in production.
-- To execute: paste into the Supabase SQL Editor and run the
-- surrounded block.  DO NOT include this file in migrations.
--
-- Prerequisites:
--   - The shared Auth user must be logged in.
--   - Run 001_initial_schema.sql and 002_hardening.sql first.
-- ============================================================

/*
-- ─── Setup ─────────────────────────────────────────────────
-- Insert a test account and milestone.
do $$
declare
  test_account_id uuid;
  test_milestone_id uuid;
  v0 integer;
begin
  insert into accounts (source, username)
    values ('Bên A', 'test_fsm_user')
    returning id into test_account_id;

  insert into account_milestones (account_id, level, price)
    values (test_account_id, 100, 500000)
    returning id into test_milestone_id;

  raise notice 'test_account_id = %', test_account_id;
  raise notice 'test_milestone_id = %', test_milestone_id;

  -- Capture initial version
  select version into v0 from accounts where id = test_account_id;
  raise notice 'initial version = %', v0;
end;
$$;

-- ─── Test 1: version_conflict ──────────────────────────────
-- move_account should reject when version is stale.
--
-- Expected error: P0001 version_conflict
--
-- do $$
-- declare
--   aid uuid;
--   v  integer;
-- begin
--   select id, version into aid, v from accounts where username = 'test_fsm_user';
--   -- simulate a stale version
--   perform move_account(aid, 'An', 0, v - 1);
--   raise exception 'UNEXPECTED: should have raised version_conflict';
-- exception
--   when raise_exception then
--     if sqlerrm like '%version_conflict%' then
--       raise notice 'PASS: version_conflict raised correctly';
--     else
--       raise exception 'FAIL: wrong message: %', sqlerrm;
--     end if;
-- end;
-- $$;

-- ─── Test 2: FSM order enforced ────────────────────────────
-- Cannot mark as 'done' unless account is in 'dang_cay' state.
-- Cannot deliver unless in 'done'.
-- Cannot pay unless in 'da_giao_cho_ben_thu'.
--
-- do $$
-- declare
--   aid uuid;
--   mid uuid;
-- begin
--   select id into aid from accounts where username = 'test_fsm_user';
--   -- Account starts in 'kho' – cannot go directly to 'done'
--   perform transition_account(aid, 'done', (select version from accounts where id = aid), null, null, null, null);
--   raise exception 'UNEXPECTED: should have rejected invalid FSM transition';
-- exception
--   when raise_exception then
--     if sqlerrm like '%invalid_transition%' then
--       raise notice 'PASS: invalid_transition for done from kho';
--     else
--       raise exception 'FAIL: wrong message: %', sqlerrm;
--     end if;
-- end;
-- $$;

-- do $$
-- declare
--   aid uuid;
-- begin
--   select id into aid from accounts where username = 'test_fsm_user';
--   -- move to dang_cay first
--   perform move_account(aid, 'TestAE', 0, (select version from accounts where id = aid));
--   -- done is now valid
--   perform transition_account(aid, 'done', (select version from accounts where id = aid), null, null, null, null);
--   raise notice 'PASS: done from dang_cay succeeded';
-- exception
--   when raise_exception then
--     raise exception 'FAIL: %', sqlerrm;
-- end;
-- $$;

-- ─── Test 3: BEFORE UPDATE trigger blocks direct writes ────
-- An authenticated UPDATE through RLS should be blocked for
-- protected columns.
--
-- Note: This test must run as the authenticated role, not as
-- postgres or the SECURITY DEFINER functions.
--
-- do $$
-- declare
--   aid uuid;
-- begin
--   select id into aid from accounts where username = 'test_fsm_user';
--   -- Attempt a direct UPDATE of a protected column (bypassing RPC)
--   update accounts set status = 'done' where id = aid;
--   raise exception 'UNEXPECTED: UPDATE should have been blocked by trigger';
-- exception
--   when raise_exception then
--     if sqlerrm like '%Protected columns%' then
--       raise notice 'PASS: trigger blocked direct UPDATE of protected column';
--     else
--       raise exception 'FAIL: %', sqlerrm;
--     end if;
-- end;
-- $$;

-- ─── Test 4: deliver requires milestone from the same account ─
-- do $$
-- declare
--   aid  uuid;
--   mid  uuid;
--   aid2 uuid;
-- begin
--   -- Create a second account with a milestone
--   insert into accounts (source, username)
--     values ('Bên B', 'test_other')
--     returning id into aid2;
--   insert into account_milestones (account_id, level, price)
--     values (aid2, 50, 250000)
--     returning id into mid;
--
--   select id into aid from accounts where username = 'test_fsm_user';
--   -- Move test_fsm_user to done
--   perform move_account(aid, 'TestAE2', 0, (select version from accounts where id = aid));
--   perform transition_account(aid, 'done', (select version from accounts where id = aid), null, null, null, null);
--
--   -- Try to deliver using a milestone from the OTHER account
--   perform transition_account(aid, 'deliver', (select version from accounts where id = aid), null, mid, null, null);
--   raise exception 'UNEXPECTED: deliver should have rejected cross-account milestone';
-- exception
--   when raise_exception then
--     if sqlerrm like '%invalid_milestone%' then
--       raise notice 'PASS: deliver blocked cross-account milestone (P0003)';
--     else
--       raise exception 'FAIL: %', sqlerrm;
--     end if;
-- end;
-- $$;

-- ─── Test 5: clear_account_image does not delete rows ──────
-- do $$
-- declare
--   aid uuid;
--   row_count_before integer;
--   row_count_after  integer;
-- begin
--   select id into aid from accounts where username = 'test_fsm_user';
--
--   select count(*) into row_count_before from accounts;
--   select count(*) into row_count_before from account_milestones where account_id = aid;
--   select count(*) into row_count_before from holder_sessions where account_id = aid;
--
--   -- Mock: set image_url manually (normally this only goes through RPC)
--   -- update accounts set image_url = 'fake/path.png', version = version + 1 where id = aid;
--
--   perform clear_account_image(aid, (select version from accounts where id = aid));
--
--   select count(*) into row_count_after from accounts;
--   if row_count_after = row_count_before then
--     raise notice 'PASS: clear_account_image did not delete accounts rows';
--   else
--     raise exception 'FAIL: accounts rows changed from % to %', row_count_before, row_count_after;
--   end if;
-- exception
--   when raise_exception then
--     raise;
-- end;
-- $$;

-- ─── Cleanup ────────────────────────────────────────────────
-- do $$
-- begin
--   delete from accounts where username in ('test_fsm_user', 'test_other');
--   raise notice 'Cleanup done';
-- end;
-- $$;
*/
