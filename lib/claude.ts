// ============================================================
// GoLo — AI Coach client
// Routes all Claude calls through the Supabase Edge Function
// (supabase/functions/ai-coach) so the API key never touches
// the client bundle.
// ============================================================

import { supabase } from './supabase';

export type InsightType =
  | 'weekly_summary'
  | 'pre_session'
  | 'round_debrief'
  | 'caddie'
  | 'swing_coach'
  | 'club_fitter'
  | 'chat';

export async function generateInsight(
  type: InsightType,
  context: object,
  userMessage?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-coach', {
    body: { type, context, userMessage },
  });
  if (error) throw error;
  return (data as { content?: string })?.content ?? '';
}
