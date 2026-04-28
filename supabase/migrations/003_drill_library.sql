-- Drill library: users can store custom drills beyond the default routine.
-- AI plan builder pulls from this table when generating new plans.

create table public.custom_drills (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  name             text        not null,
  duration_minutes integer     not null default 10 check (duration_minutes > 0),
  description      text,
  category         text        not null default 'General',
  never_cut        boolean     not null default false,
  created_at       timestamptz not null default now()
);

alter table public.custom_drills enable row level security;

create policy "Users manage their own drills"
  on public.custom_drills
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index custom_drills_user_id_idx on public.custom_drills (user_id);
