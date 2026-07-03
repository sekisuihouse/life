create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  station_name text not null,
  station_type text not null check (station_type in ('rain', 'water_level', 'weather')),
  river_name text,
  observed_at timestamptz not null,
  value numeric,
  unit text not null,
  raw_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists observations_station_time_idx
  on public.observations (station_type, station_name, observed_at desc);

create table if not exists public.safety_snapshots (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('OK', 'NG', 'UNKNOWN')),
  reasons jsonb not null,
  metrics jsonb not null,
  source_health jsonb not null,
  calculated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  borrower_name text not null default '',
  borrowed_at timestamptz not null default now(),
  returned_at timestamptz,
  item_count integer not null check (item_count > 0 and item_count <= 20),
  size text not null,
  memo text not null default '',
  return_photo_url text,
  return_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rentals_one_active_per_user_idx
  on public.rentals (user_id)
  where returned_at is null;

create table if not exists public.admin_overrides (
  id uuid primary key default gen_random_uuid(),
  force_ng boolean not null default false,
  message text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rentals_touch_updated_at on public.rentals;
create trigger rentals_touch_updated_at
before update on public.rentals
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.observations enable row level security;
alter table public.safety_snapshots enable row level security;
alter table public.rentals enable row level security;
alter table public.admin_overrides enable row level security;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "rentals read own" on public.rentals
  for select using (auth.uid() = user_id);

create policy "rentals insert own" on public.rentals
  for insert with check (auth.uid() = user_id);

create policy "rentals update own return" on public.rentals
  for update using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('return-photos', 'return-photos', true)
on conflict (id) do nothing;

create policy "return photos authenticated upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'return-photos');

create policy "return photos public read" on storage.objects
  for select
  using (bucket_id = 'return-photos');
