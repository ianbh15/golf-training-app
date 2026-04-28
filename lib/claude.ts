// ============================================================
// GoLo — Claude AI Coach Wrapper
//
// SECURITY NOTE: EXPO_PUBLIC_ prefix exposes the key to the
// client bundle. Move all Claude calls to a Supabase Edge
// Function (supabase/functions/ai-coach) before production.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('[GoLo] EXPO_PUBLIC_ANTHROPIC_API_KEY not set. Move to Edge Function before production.');
    }
    _client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return _client;
}

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type InsightType = 'weekly_summary' | 'pre_session' | 'round_debrief' | 'chat';

const SYSTEM_PROMPT = `You are a performance coach for a 3-handicap golfer using the GoLo app.
You have access to their practice session logs and round data.
Be direct, specific, and data-driven. Do not explain golf fundamentals.
Reference actual metrics from their sessions (e.g. Pressure Finish scores, sequence quality %, SG numbers).
Keep responses under 250 words unless the user asks a specific question.
The golfer's primary swing key: lower body fires first — hips bump and rotate before shoulders and hands move.
When referencing practice blocks use their actual names: Wedge Calibration, Staircase Drill, Pressure Finish, Distance Control Putting, Chipping Variety, Make Zone Putting, Quick Groove, Gap Yardage Wedges, 5-Hole Simulation, Clutch Putting.`;

// ──────────────────────────────────────────────────────────
// Prompt builders
// ──────────────────────────────────────────────────────────

function buildPrompt(type: InsightType, context: object): string {
  const json = JSON.stringify(context, null, 2);
  switch (type) {
    case 'weekly_summary':
      return `Weekly performance data:\n${json}\n\nIdentify the 1-2 biggest scoring leaks and give specific practice adjustments for next week. Reference actual block names and metric results where available.`;
    case 'pre_session':
      return `Upcoming session and recent history:\n${json}\n\nGive a 2-3 sentence focus cue for today's session based on recent patterns. Be specific to the blocks they are about to do.`;
    case 'round_debrief':
      return `Round data:\n${json}\n\nDebrief this round. Where were shots lost? What should be prioritized in practice this week? Reference strokes gained data if available.`;
    default:
      return json;
  }
}

// ──────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────

export async function generateInsight(
  type: InsightType,
  context: object,
  userMessage?: string
): Promise<string> {
  const client = getClient();
  const userPrompt = userMessage ?? buildPrompt(type, context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
