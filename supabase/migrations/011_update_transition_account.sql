-- 011_update_transition_account.sql
-- Thêm các action hoàn tác vào transition_account

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

  when 'revert_to_dang_cay' then
    if a.status != 'done' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts set status = 'dang_cay', completed_at = null, version = version + 1
      where id = a.id returning * into a;

  when 'revert_to_done' then
    if a.status != 'da_giao_cho_ben_thu' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts set status = 'done', delivered_at = null, version = version + 1
      where id = a.id returning * into a;

  when 'revert_to_delivered' then
    if a.status != 'da_nhan_tien' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts set status = 'da_giao_cho_ben_thu', paid_at = null, amount_received = null, version = version + 1
      where id = a.id returning * into a;

  else
    raise exception 'invalid_transition' using errcode = 'P0002';
  end case;

  return a;
end;
$$;