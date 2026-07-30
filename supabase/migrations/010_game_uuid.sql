-- Add game_uuid column to accounts table
do $$ begin
  alter table accounts add column if not exists game_uuid text;
exception when others then null; end $$;
