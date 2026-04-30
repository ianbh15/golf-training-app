// ============================================================
// GoLo — AI Insight Helpers
// Context builders + hash-aware generate-and-save utilities.
// All functions fail gracefully — never throw to the caller.
// ============================================================

import { supabase } from './supabase';
import { generateInsight, InsightType } from './claude';
import type { AiInsight, Round, SessionBlock } from './types/database';

// ──────────────────────────────────────────────────────────
// Hash: stable cache key for a context object + optional question.
// Uses a simple polynomial hash — good enough for cache dedup,
// not for security. Avoids the Node crypto module (React Native).
// ──────────────────────────────────────────────────────────

function hashContext(obj: object, userMessage?: string): string {
  const str = JSON.stringify(obj) + (userMessage ?? '');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ──────────────────────────────────────────────────────────
// Core: generate insight text + persist to ai_insights.
// Returns cached insight immediately if context (and question
// for chat types) hasn't changed since last generation.
// ──────────────────────────────────────────────────────────

export async function generateAndSaveInsight(
  userId: string,
  type: InsightType,
  context: object,
  userMessage?: string
): Promise<AiInsight | null> {
  try {
    const hash = hashContext(context, userMessage);

    // Return cached insight if the underlying data hasn't changed
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('insight_type', type)
      .eq('context_hash', hash)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) return cached;

    const content = await generateInsight(type, context, userMessage);
    if (!content) return null;

    // Store the question alongside context so history is browsable
    const contextToSave = userMessage
      ? { ...(context as object), _question: userMessage }
      : context;

    const { data, error } = await supabase
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: type,
        content,
        context_json: contextToSave as never,
        context_hash: hash,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[GoLo AI] generateAndSaveInsight failed:', err);
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Context: round_debrief
// ──────────────────────────────────────────────────────────

export async function buildRoundDebriefContext(userId: string, round: Round) {
  const [sessionsRes, handicapRes] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(3),
    supabase
      .from('handicap_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(5),
  ]);

  const sessions = sessionsRes.data ?? [];
  const sessionBlocks = await fetchBlocksForSessions(sessions.map((s) => s.id));

  return {
    round,
    last_3_sessions: sessions.map((s) => ({
      ...s,
      blocks: sessionBlocks.filter((b) => b.session_id === s.id),
    })),
    handicap_trend: handicapRes.data ?? [],
  };
}

// ──────────────────────────────────────────────────────────
// Context: pre_session
// ──────────────────────────────────────────────────────────

export async function buildPreSessionContext(
  userId: string,
  dayType: 'tuesday' | 'wednesday' | 'thursday',
  upcomingBlocks: object[]
) {
  const [sessionsRes, roundsRes] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(2),
    supabase
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(2),
  ]);

  const sessions = sessionsRes.data ?? [];
  const sessionBlocks = await fetchBlocksForSessions(sessions.map((s) => s.id));

  return {
    todays_day_type: dayType,
    last_2_sessions: sessions.map((s) => ({
      ...s,
      blocks: sessionBlocks.filter((b) => b.session_id === s.id),
    })),
    last_2_rounds: roundsRes.data ?? [],
    upcoming_blocks: upcomingBlocks,
  };
}

// ──────────────────────────────────────────────────────────
// Context: weekly_summary
// ──────────────────────────────────────────────────────────

export async function buildWeeklySummaryContext(userId: string) {
  const [roundsRes, sessionsRes, handicapRes] = await Promise.all([
    supabase
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(4),
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(8),
    supabase
      .from('handicap_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })
      .limit(10),
  ]);

  const sessions = sessionsRes.data ?? [];
  const sessionBlocks = await fetchBlocksForSessions(sessions.map((s) => s.id));

  const last3Sessions = sessions.slice(0, 3).map((s) => ({
    ...s,
    blocks: sessionBlocks.filter((b) => b.session_id === s.id),
  }));

  const sequenceQualityTrend = sessions
    .map((s) => {
      const relevant = sessionBlocks.filter(
        (b) => b.session_id === s.id && b.sequence_felt_right !== null
      );
      if (!relevant.length) return null;
      const pct = Math.round(
        (relevant.filter((b) => b.sequence_felt_right).length / relevant.length) * 100
      );
      return { date: s.session_date, pct };
    })
    .filter(Boolean) as { date: string; pct: number }[];

  return {
    last_4_rounds: roundsRes.data ?? [],
    last_3_sessions: last3Sessions,
    sequence_quality_trend: sequenceQualityTrend,
    handicap_trend: handicapRes.data ?? [],
  };
}

// ──────────────────────────────────────────────────────────
// Context: caddie (course management, shot selection)
// ──────────────────────────────────────────────────────────

export async function buildCaddieContext(userId: string) {
  const [roundsRes, sessionsRes] = await Promise.all([
    supabase
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(6),
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(2),
  ]);

  return {
    recent_rounds: roundsRes.data ?? [],
    last_2_sessions: sessionsRes.data ?? [],
  };
}

// ──────────────────────────────────────────────────────────
// Context: swing_coach (ball striking, sequence quality)
// ──────────────────────────────────────────────────────────

export async function buildSwingCoachContext(userId: string) {
  const sessionsRes = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(6);

  const sessions = sessionsRes.data ?? [];
  const sessionBlocks = await fetchBlocksForSessions(sessions.map((s) => s.id));

  const sequenceQualityTrend = sessions
    .map((s) => {
      const relevant = sessionBlocks.filter(
        (b) => b.session_id === s.id && b.sequence_felt_right !== null
      );
      if (!relevant.length) return null;
      const pct = Math.round(
        (relevant.filter((b) => b.sequence_felt_right).length / relevant.length) * 100
      );
      return { date: s.session_date, pct };
    })
    .filter(Boolean) as { date: string; pct: number }[];

  return {
    last_6_sessions: sessions.map((s) => ({
      ...s,
      blocks: sessionBlocks.filter((b) => b.session_id === s.id),
    })),
    sequence_quality_trend: sequenceQualityTrend,
  };
}

// ──────────────────────────────────────────────────────────
// Context: club_fitter (distance gaps, yardage control)
// ──────────────────────────────────────────────────────────

export async function buildClubFitterContext(userId: string) {
  const [sessionsRes, roundsRes] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(8),
    supabase
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(6),
  ]);

  const sessions = sessionsRes.data ?? [];
  const sessionBlocks = await fetchBlocksForSessions(sessions.map((s) => s.id));

  const distanceBlocks = sessionBlocks.filter((b) =>
    ['gap_yardage', 'wedge_calibration', 'distance_control'].some((key) =>
      b.block_key.toLowerCase().includes(key)
    )
  );

  return {
    distance_practice_blocks: distanceBlocks,
    last_6_rounds: roundsRes.data ?? [],
  };
}

// ──────────────────────────────────────────────────────────
// Cache check: pre_session insight already generated today
// ──────────────────────────────────────────────────────────

export async function getTodaysPreSessionInsight(
  userId: string
): Promise<AiInsight | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('insight_type', 'pre_session')
    .gte('generated_at', `${today}T00:00:00`)
    .lte('generated_at', `${today}T23:59:59`)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// ──────────────────────────────────────────────────────────
// Internal: fetch session_blocks for an array of session IDs
// ──────────────────────────────────────────────────────────

async function fetchBlocksForSessions(sessionIds: string[]): Promise<SessionBlock[]> {
  if (!sessionIds.length) return [];
  const { data } = await supabase
    .from('session_blocks')
    .select('*')
    .in('session_id', sessionIds);
  return data ?? [];
}
