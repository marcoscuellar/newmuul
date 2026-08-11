-- Múul — account-based storage schema.
-- Run this once in the Supabase SQL editor (or via the CLI) after creating the
-- project. It creates a single per-user state row, locked down with RLS so each
-- account can only read and write its own data.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Grant table privileges to signed-in users (RLS below still restricts to own
-- row). Makes the schema self-sufficient even if "automatically expose new
-- tables" is off in project settings.
grant select, insert, update on public.app_state to authenticated;

-- Each authenticated user may read/insert/update only their own row.
drop policy if exists "own row select" on public.app_state;
create policy "own row select" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "own row insert" on public.app_state;
create policy "own row insert" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own row update" on public.app_state;
create policy "own row update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
