// Supabase Edge Function: ai-coach
// Deploy with: supabase functions deploy ai-coach
//
// This is the server-side Claude API proxy.
// ANTHROPIC_API_KEY is stored as a Supabase secret (never client-side).
// Set it with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are a performance coach for a 3-handicap golfer named Ian.
You have access to his practice session logs and round data.
Be direct, specific, and data-driven. Do not explain fundamentals.
Reference actual metrics from his sessions (e.g. Pressure Finish scores, sequence quality, SG numbers).
Keep responses under 250 words unless asked a specific question.
Ian's swing key focus: lower body fires first, hips rotate before shoulders and hands move.
Tone: direct, analytical, no fluff — like a Tour caddie who has studied the data.`;

const PLAN_SYSTEM_PROMPT = `You are a golf practice plan architect.
You design structured, drill-based weekly practice plans for skilled golfers.
You must return ONLY valid JSON — no markdown fences, no commentary, no prose.
Plans must be specific, time-budgeted, and metric-driven.
Tone in the JSON content fields: direct, no fluff, like a Tour caddie's notebook.`;

const PLAN_JSON_SHAPE = `Return JSON with this exact shape:
[
  {
    "day": "tuesday",
    "focus": "Ball Striking",
    "totalMinutes": 40,
    "swingKey": "<one-sentence swing focus for the day>",
    "blocks": [
      {
        "key": "<unique snake_case id, e.g. tuesday_warmup>",
        "name": "<short block title>",
        "durationMin": 4,
        "description": "<one-line block description>",
        "swingKeyCritical": true,
        "neverCut": false,
        "metric": {
          "label": "<short label, e.g. Targets Hit>",
          "target": "<concrete target, e.g. 4/6 or better>",
          "inputType": "fraction",
          "numerator": 0,
          "denominator": 6
        },
        "drills": ["<drill 1>", "<drill 2>", "<drill 3>"]
      }
    ]
  }
]

Rules:
- Every day has a "day" field (lowercase weekday string), "focus", "totalMinutes" (sum of block durations), "swingKey", and a "blocks" array.
- Each block has all fields shown. "metric" is optional — omit the field entirely if the block has no measurable target.
- "inputType" must be one of "fraction", "boolean", or "text".
- For "fraction" metrics include numerator (0) and denominator. Otherwise omit those.
- Mark exactly one or two blocks per day with "neverCut": true — the highest-priority block(s).
- Drill arrays should have 2–5 short imperative bullets.`;

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY secret is not set');
    }

    const { type, context, userMessage } = await req.json();

    // ── Plan generation: structured JSON output ──
    if (type === 'plan_generation') {
      const {
        handicap,
        goals,
        daysPerWeek,
        sessionMinutes,
        weaknesses,
      }: {
        handicap?: number;
        goals?: string[];
        daysPerWeek?: number;
        sessionMinutes?: number;
        weaknesses?: string;
      } = context ?? {};

      const userPrompt = `Build a custom weekly practice plan for this golfer.

Handicap: ${handicap ?? 'unspecified'}
Primary goals: ${goals?.join(', ') || 'general improvement'}
Days available per week: ${daysPerWeek ?? 3}
Session length: ${sessionMinutes ?? 40} minutes per session
Specific weaknesses: ${weaknesses || 'none specified'}

${PLAN_JSON_SHAPE}

Generate exactly ${daysPerWeek ?? 3} day(s). Each day's blocks must total approximately ${sessionMinutes ?? 40} minutes. Tailor day focuses and blocks to the goals and weaknesses listed.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: PLAN_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      const data = await response.json();
      const raw: string = data?.content?.[0]?.text ?? '';

      // Strip accidental markdown fences if Claude added any
      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      let plan: unknown;
      try {
        plan = JSON.parse(cleaned);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Model did not return valid JSON', raw }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      return new Response(JSON.stringify({ plan }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── Text-content insights (existing behavior) ──
    let userPrompt: string;
    if (userMessage) {
      userPrompt = userMessage;
    } else {
      const json = JSON.stringify(context, null, 2);
      switch (type) {
        case 'weekly_summary':
          userPrompt = `Weekly performance data:\n${json}\n\nIdentify the 1-2 biggest scoring leaks and give specific practice adjustments for next week. Reference block metrics by name.`;
          break;
        case 'pre_session':
          userPrompt = `Upcoming session data and recent history:\n${json}\n\nGive a 2-3 sentence focus cue for today's session based on recent patterns. Be prescriptive, not motivational.`;
          break;
        case 'round_debrief':
          userPrompt = `Round data:\n${json}\n\nDebrief this round. Where were shots lost? What should be prioritized in practice this week? Reference the SG data if available.`;
          break;
        default:
          userPrompt = json;
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    const content = data?.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ content }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
