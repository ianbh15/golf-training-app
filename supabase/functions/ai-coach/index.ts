// Supabase Edge Function: ai-coach
// Deploy with: supabase functions deploy ai-coach
//
// ANTHROPIC_API_KEY stored as a Supabase secret — never client-side.
// Set with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from 'npm:@anthropic-ai/sdk@0.91.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Model routing ─────────────────────────────────────────
// Haiku for short, quick-turnaround outputs.
// Sonnet for analysis, plans, and technical coaching.
function modelFor(type: string): string {
  return type === 'pre_session' || type === 'chat'
    ? 'claude-haiku-4-5'
    : 'claude-sonnet-4-6';
}

// ── System prompts ────────────────────────────────────────

const COACH_PROMPT = `You are a performance coach for Ian, a 3-handicap golfer using the GoLo app.
You have access to his practice session logs and round data.
Be direct, specific, and data-driven. Do not explain golf fundamentals.
Reference actual metrics from his sessions (e.g. Pressure Finish scores, sequence quality %, SG numbers).
Keep responses under 250 words unless the user asks a specific question.
Ian's swing key: lower body fires first — hips bump and rotate before shoulders and hands move.
Reference practice blocks by name: Wedge Calibration, Staircase Drill, Pressure Finish, Distance Control Putting, Chipping Variety, Make Zone Putting, Quick Groove, Gap Yardage Wedges, 5-Hole Simulation, Clutch Putting.`;

const CADDIE_PROMPT = `You are Ian's on-course caddie — analytical, terse, zero fluff.
Ian is a 3-handicap. His tendency under pressure: overswing, lose sequence, early extension.
His swing key: lower body initiates, hips rotate before shoulders and hands.
Your job: shot selection, course management, target lines, pre-shot routine cues.
Reference his SG splits and key moments from recent rounds when available.
Be concrete — name the club, name the target, name the number.
Max 150 words.`;

const SWING_COACH_PROMPT = `You are Ian's swing coach. You have reviewed every practice session's block metrics.
Ian's primary focus: lower body initiates — hips bump and rotate before shoulders and hands move.
When sequence_felt_right % drops below 60%, that is the first thing to address.
Reference specific block results by name: Pressure Finish scores, Staircase Drill reps, Quick Groove feel, sequence quality %.
Give one concrete adjustment. Not general encouragement.
Max 200 words unless asked for more.`;

const CLUB_FITTER_PROMPT = `You are Ian's club fitter. You analyze his distance data from practice blocks and rounds.
Key sources: Wedge Calibration metric_result, Gap Yardage Wedges metric_result, Distance Control Putting, sg_approach from rounds.
Identify distance gaps, yardage inconsistency, wedge calibration drift.
Be specific — name the yardages. "You carry your 52° at 102 yards but have a 14-yard gap before your PW" not "consider your wedge gaps."
Max 200 words unless asked for more.`;

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

function getSystemPrompt(type: string): string {
  switch (type) {
    case 'caddie': return CADDIE_PROMPT;
    case 'swing_coach': return SWING_COACH_PROMPT;
    case 'club_fitter': return CLUB_FITTER_PROMPT;
    case 'plan_generation': return PLAN_SYSTEM_PROMPT;
    default: return COACH_PROMPT;
  }
}

// ── Default prompt builders (used when userMessage not provided) ──
function buildDefaultPrompt(type: string, context: object): string {
  const json = JSON.stringify(context, null, 2);
  switch (type) {
    case 'weekly_summary':
      return `Weekly performance data:\n${json}\n\nIdentify the 1-2 biggest scoring leaks and give specific practice adjustments for next week. Reference block metrics by name.`;
    case 'pre_session':
      return `Upcoming session data and recent history:\n${json}\n\nGive a 2-3 sentence focus cue for today's session based on recent patterns. Be prescriptive, not motivational.`;
    case 'round_debrief':
      return `Round data:\n${json}\n\nDebrief this round. Where were shots lost? What should be prioritized in practice this week? Reference the SG data if available.`;
    case 'caddie':
      return `Recent round and practice data:\n${json}\n\nWhat should I focus on for on-course management based on recent patterns?`;
    case 'swing_coach':
      return `Practice session data:\n${json}\n\nAnalyze my ball striking and sequence quality. What should I focus on?`;
    case 'club_fitter':
      return `Distance and yardage data:\n${json}\n\nAnalyze my distance gaps and yardage control.`;
    default:
      return json;
  }
}

// ── max_tokens per type ───────────────────────────────────
function maxTokensFor(type: string): number {
  if (type === 'plan_generation') return 4000;
  if (type === 'pre_session') return 200;
  if (type === 'caddie') return 300;
  return 600;
}

// ── Core Anthropic call via SDK with prompt caching on system ─────
async function callAnthropic(
  client: Anthropic,
  type: string,
  userPrompt: string
): Promise<string> {
  const message = await client.messages.create({
    model: modelFor(type),
    max_tokens: maxTokensFor(type),
    system: [
      {
        type: 'text',
        text: getSystemPrompt(type),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content.find((b) => b.type === 'text');
  return block?.type === 'text' ? block.text : '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY secret is not set');
    }

    const client = new Anthropic({ apiKey });
    const { type, context, userMessage } = await req.json();

    // ── Plan generation: structured JSON output ──────────
    if (type === 'plan_generation') {
      const {
        handicap,
        goals,
        daysPerWeek,
        sessionMinutes,
        weaknesses,
        customDrills,
      }: {
        handicap?: number;
        goals?: string[];
        daysPerWeek?: number;
        sessionMinutes?: number;
        weaknesses?: string;
        customDrills?: { name: string; durationMinutes: number; category: string; description?: string | null; neverCut: boolean }[];
      } = context ?? {};

      const drillsSection = customDrills && customDrills.length > 0
        ? `\nCustom drills from the golfer's library (incorporate these into appropriate blocks where relevant; mark neverCut drills accordingly):\n${customDrills.map((d) => `- ${d.name} (${d.durationMinutes} min, ${d.category}${d.neverCut ? ', NEVER CUT' : ''}${d.description ? `: ${d.description}` : ''})`).join('\n')}\n`
        : '';

      const planPrompt = `Build a custom weekly practice plan for this golfer.

Handicap: ${handicap ?? 'unspecified'}
Primary goals: ${goals?.join(', ') || 'general improvement'}
Days available per week: ${daysPerWeek ?? 3}
Session length: ${sessionMinutes ?? 40} minutes per session
Specific weaknesses: ${weaknesses || 'none specified'}
${drillsSection}
${PLAN_JSON_SHAPE}

Generate exactly ${daysPerWeek ?? 3} day(s). Each day's blocks must total approximately ${sessionMinutes ?? 40} minutes. Tailor day focuses and blocks to the goals and weaknesses listed.`;

      const raw = await callAnthropic(client, 'plan_generation', planPrompt);
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
          { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      return new Response(JSON.stringify({ plan }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // ── All other insight types ──────────────────────────
    const userPrompt = userMessage ?? buildDefaultPrompt(type, context ?? {});
    const content = await callAnthropic(client, type, userPrompt);

    return new Response(JSON.stringify({ content }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
});
