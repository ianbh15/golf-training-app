-- GoLo — AI cache layer
-- Run after 003_drill_library.sql

-- Context hash for deduplication: skip API call when same data was already analyzed
alter table ai_insights add column if not exists context_hash text;

-- Expand insight_type to include specialist modes and persisted chat
alter table ai_insights drop constraint if exists ai_insights_insight_type_check;
alter table ai_insights add constraint ai_insights_insight_type_check
  check (insight_type in (
    'weekly_summary', 'pre_session', 'round_debrief',
    'caddie', 'swing_coach', 'club_fitter', 'chat'
  ));

create index if not exists idx_ai_insights_context_hash
  on ai_insights(user_id, insight_type, context_hash)
  where context_hash is not null;
