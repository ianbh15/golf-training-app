// ============================================================
// GoLo — Claude AI Coach Wrapper
// 
// SECURITY NOTE: In production, all Claude calls must go through
// Supabase Edge Functions to keep ANTHROPIC_API_KEY server-side.
// This direct client call is for local development ONLY.
// See: supabase/functions/ai-coach/index.ts
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[Claude] ANTHROPIC_API_KEY is not set. For production, use Supabase Edge Functions.'
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type InsightType = 'weekly_summary' | 'pre_session' | 'round_debrief' | 'chat';

const SYSTEM_PROMPT = `You are a performance coach for a 3-handicap golfer named Ian.
You have access to his practice session logs and round data.
Be direct, specific, and data-driven. Do not explain fundamentals.
Reference actual metrics from his sessions (e.g. Pressure Finish scores, sequence quality, SG numbers).
Keep responses under 250 words unless asked a specific question.
Ian's swing key focus: lower body fires first, hips rotate before shoulders and hands move.
Tone: direct, analytical, no fluff — like a Tour caddie who has studied the data.`;

// ──────────────────────────────────────────────────────────
// Prompt builders
// ──────────────────────────────────────────────────────────

function buildPrompt(type: InsightType, context: object): string {
  const json = JSON.stringify(context, null, 2);
  switch (type) {
    case 'weekly_summary':
      return `Weekly performance data:\n${json}\n\nIdentify the 1-2 biggest scoring leaks and give specific practice adjustments for next week. Reference block metrics by name.`;

    case 'pre_session':
      return `Upcoming session data and recent history:\n${json}\n\nGive a 2-3 sentence focus cue for today's session based on recent patterns. Be prescriptive, not motivational.`;

    case 'round_debrief':
      return `Round data:\n${json}\n\nDebrief this round. Where were shots lost? What should be prioritized in practice this week? Reference the SG data if available.`;

    default:
      return json;
  }
}

// ──────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────

/**
 * Generate an AI insight. In production, route through Supabase Edge Function.
 */
export async function generateInsight(
  type: InsightType,
  context: object,
  userMessage?: string
): Promise<string> {
  const client = getClient();

  const userPrompt = userMessage ?? buildPrompt(type, context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

/**
 * Context builders — assemble the data object to pass to generateInsight
 */
export type WeeklySummaryContext = {
  last_4_rounds: object[];
  last_3_sessions: object[];
  session_blocks: object[][];
  handicap_trend: object[];
};

export type PreSessionContext = {
  todays_day: string;
  swing_key: string;
  last_session: object | null;
  last_session_blocks: object[];
};

export type RoundDebriefContext = {
  round: object;
};
