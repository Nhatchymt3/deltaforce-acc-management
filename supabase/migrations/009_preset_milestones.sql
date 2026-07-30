-- ─── Preset Milestones Table (Mốc cày quản lý riêng) ──────────────
create table if not exists preset_milestones (
  id          uuid primary key default gen_random_uuid(),
  level       integer not null,
  price       text not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique(level, price)
);

alter table preset_milestones enable row level security;

do $$ begin
  create policy "authenticated preset_milestones" on preset_milestones
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
