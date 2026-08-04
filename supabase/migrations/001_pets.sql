-- pets table aligned with Supabase public.pets

create extension if not exists "pgcrypto";

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  breeder_id uuid,
  name text not null,
  public_display_name text,
  breed text not null,
  sex text not null check (sex in ('male', 'female')),
  birthday date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pets_status_idx on public.pets (status);
create index if not exists pets_created_at_idx on public.pets (created_at desc);

alter table public.pets enable row level security;

-- Development policy: replace with breeder-scoped policies when auth is connected
create policy "pets_allow_all_for_development"
  on public.pets
  for all
  using (true)
  with check (true);
