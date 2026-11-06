-- Rename existing tong_mon_event table to site_event if present
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tong_mon_event')
     and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'site_event') then
    alter table public.tong_mon_event rename to site_event;
  end if;
end $$;

-- Create site_event table if it does not exist
create table if not exists public.site_event (
  id integer primary key check (id = 1),
  title text not null default 'Bí Cảnh Tông Môn',
  start_at timestamptz not null,
  end_at timestamptz not null,
  url text not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint site_event_range check (end_at > start_at)
);

-- Ensure title column exists if table was created previously without it
alter table public.site_event
  add column if not exists title text not null default 'Bí Cảnh Tông Môn';

alter table public.site_event enable row level security;

drop policy if exists tong_mon_event_select_public on public.site_event;
drop policy if exists site_event_select_public on public.site_event;
create policy site_event_select_public
  on public.site_event
  for select
  to anon, authenticated
  using (true);

grant select on table public.site_event to anon, authenticated;
grant all on table public.site_event to service_role;
