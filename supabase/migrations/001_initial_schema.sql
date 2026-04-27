-- Golf Performance OS — Supabase Schema Migration
-- Run this in your Supabase SQL Editor

-- ============================================================
-- Practice Sessions
-- ============================================================
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  session_date date not null,
  day_type text check (day_type in ('tuesday', 'wednesday', 'thursday')) not null,
  started_at timestamptz,
  completed_at timestamptz,
  overall_quality integer check (overall_quality between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table practice_sessions enable row level security;

create policy "Users can CRUD their own sessions"
  on practice_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Session Blocks (one row per block per session)
-- ============================================================
create table if not exists session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references practice_sessions on delete cascade not null,
  block_key text not null,
  completed boolean default false,
  quality integer check (quality between 1 and 5),
  metric_result text,
  notes text,
  sequence_felt_right boolean,
  created_at timestamptz default now()
);

alter table session_blocks enable row level security;

create policy "Users can CRUD their own blocks"
  on session_blocks for all
  using (
    exists (
      select 1 from practice_sessions ps
      where ps.id = session_blocks.session_id
        and ps.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from practice_sessions ps
      where ps.id = session_blocks.session_id
        and ps.user_id = auth.uid()
    )
  );

-- ============================================================
-- Rounds
-- ============================================================
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  played_date date not null,
  course_name text not null,
  gross_score integer not null,
  course_rating numeric(4,1),
  slope integer,
  handicap_differential numeric(4,1),
  -- Strokes Gained (optional)
  sg_off_tee numeric(4,2),
  sg_approach numeric(4,2),
  sg_around_green numeric(4,2),
  sg_putting numeric(4,2),
  -- Qualitative
  key_moment text,
  mental_state integer check (mental_state between 1 and 5),
  conditions text,
  created_at timestamptz default now()
);

alter table rounds enable row level security;

create policy "Users can CRUD their own rounds"
  on rounds for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- AI Coach Insights
-- ============================================================
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  generated_at timestamptz default now(),
  insight_type text check (insight_type in ('weekly_summary', 'pre_session', 'round_debrief')),
  content text not null,
  context_json jsonb
);

alter table ai_insights enable row level security;

create policy "Users can CRUD their own insights"
  on ai_insights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Handicap History
-- ============================================================
create table if not exists handicap_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  recorded_date date not null,
  handicap_index numeric(4,1) not null
);

alter table handicap_history enable row level security;

create policy "Users can CRUD their own handicap history"
  on handicap_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_practice_sessions_user_date
  on practice_sessions(user_id, session_date desc);

create index if not exists idx_rounds_user_date
  on rounds(user_id, played_date desc);

create index if not exists idx_ai_insights_user_type
  on ai_insights(user_id, insight_type, generated_at desc);

create index if not exists idx_handicap_history_user_date
  on handicap_history(user_id, recorded_date desc);
