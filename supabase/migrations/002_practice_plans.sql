-- GoLo — Practice Plans Migration
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

-- ============================================================
-- Practice Plans
-- Stores DayRoutine[] structures so users can have a default
-- routine or a custom AI-generated plan, with history of past
-- plans preserved (is_active = false on archive).
-- ============================================================

create table if not exists public.practice_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  is_active       boolean not null default true,
  generated_by    text not null check (generated_by in ('default', 'ai')),
  name            text,
  plan_json       jsonb not null
);

create index if not exists practice_plans_user_active_idx
  on public.practice_plans (user_id, is_active desc, created_at desc);

-- Only one active plan per user. Use a partial unique index so
-- archived rows aren't constrained.
create unique index if not exists practice_plans_one_active_per_user
  on public.practice_plans (user_id) where is_active;

alter table public.practice_plans enable row level security;

drop policy if exists "Users read own plans" on public.practice_plans;
create policy "Users read own plans"
  on public.practice_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own plans" on public.practice_plans;
create policy "Users insert own plans"
  on public.practice_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own plans" on public.practice_plans;
create policy "Users update own plans"
  on public.practice_plans for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own plans" on public.practice_plans;
create policy "Users delete own plans"
  on public.practice_plans for delete
  using (auth.uid() = user_id);
