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

    // Build prompt
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
