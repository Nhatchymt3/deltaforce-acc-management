-- 011_revert_status.sql

create or replace function revert_account_status(
  p_account_id uuid,
  p_target_status text
) returns accounts
language plpgsql security definer set search_path = public
as $$
declare
  a accounts;
begin
  select * into a from accounts where id = p_account_id for update;

  if p_target_status = 'dang_cay' then
    if a.status != 'done' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts
      set status = 'dang_cay',
          completed_at = null,
          version = version + 1
      where id = a.id returning * into a;

  elsif p_target_status = 'done' then
    if a.status != 'da_giao_cho_ben_thu' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts
      set status = 'done',
          delivered_at = null,
          version = version + 1
      where id = a.id returning * into a;

  elsif p_target_status = 'da_giao_cho_ben_thu' then
    if a.status != 'da_nhan_tien' then
      raise exception 'invalid_transition' using errcode = 'P0002';
    end if;
    update accounts
      set status = 'da_giao_cho_ben_thu',
          paid_at = null,
          amount_received = null,
          version = version + 1
      where id = a.id returning * into a;

  else
    raise exception 'invalid_target_status' using errcode = 'P0002';
  end if;

  return a;
end;
$$;