// Supabase Edge Function: ai-trade-review
//
// ユーザーの取引統計サマリを受け取り、OpenAI Chat Completions を使って
// トレードコーチとしての気づき・改善提案（3〜5個）を生成して返す。
//
// 注意:
//   - これは Deno ランタイムで実行される。React Native 側の tsc 対象外。
//   - import は Deno のリモート URL を使う。
//   - OPENAI_API_KEY が未設定なら 503 を返し、クライアント側で
//     「準備中（管理者の設定が必要）」と案内できるようにする。
//
// デプロイ手順は同ディレクトリの README.md を参照。

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// locale → AI に指示する出力言語名
const LANGUAGE_NAMES: Record<string, string> = {
  ja: 'Japanese (日本語)',
  en: 'English',
  pt: 'Portuguese (Português)',
  es: 'Spanish (Español)',
};

type PairStat = {
  pair: string;
  trades: number;
  pnl: number;
  winRate: number;
};

type TagStat = {
  tag: string;
  trades: number;
  pnl: number;
  winRate: number;
};

type StatsPayload = {
  totalPnl?: number;
  winRate?: number;
  totalTrades?: number;
  profitFactor?: number;
  avgWin?: number;
  avgLoss?: number;
  maxWin?: number;
  maxLoss?: number;
  winStreak?: number;
  loseStreak?: number;
  byPair?: PairStat[];
  byTag?: TagStat[];
  locale?: string;
};

function buildPrompt(stats: StatsPayload): string {
  const lines: string[] = [];
  lines.push(`Total trades: ${stats.totalTrades ?? 0}`);
  lines.push(`Total P&L: ${stats.totalPnl ?? 0}`);
  lines.push(`Win rate: ${(stats.winRate ?? 0).toFixed(1)}%`);
  lines.push(
    `Profit factor: ${
      stats.profitFactor === Infinity || stats.profitFactor === null
        ? 'infinite'
        : (stats.profitFactor ?? 0).toFixed(2)
    }`,
  );
  lines.push(`Average win: ${stats.avgWin ?? 0}`);
  lines.push(`Average loss: ${stats.avgLoss ?? 0}`);
  lines.push(`Max win: ${stats.maxWin ?? 0}`);
  lines.push(`Max loss: ${stats.maxLoss ?? 0}`);
  lines.push(`Max win streak: ${stats.winStreak ?? 0}`);
  lines.push(`Max lose streak: ${stats.loseStreak ?? 0}`);

  if (Array.isArray(stats.byPair) && stats.byPair.length > 0) {
    lines.push('By currency pair:');
    for (const p of stats.byPair.slice(0, 10)) {
      lines.push(
        `  - ${p.pair}: ${p.trades} trades, P&L ${p.pnl}, win rate ${p.winRate.toFixed(0)}%`,
      );
    }
  }
  if (Array.isArray(stats.byTag) && stats.byTag.length > 0) {
    lines.push('By strategy tag:');
    for (const tg of stats.byTag.slice(0, 10)) {
      lines.push(
        `  - ${tg.tag}: ${tg.trades} trades, P&L ${tg.pnl}, win rate ${tg.winRate.toFixed(0)}%`,
      );
    }
  }
  return lines.join('\n');
}

serve(async (req: Request) => {
  // CORS プリフライト
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    // 未設定: クライアントが「準備中」と表示できるよう 503 を返す
    return json(
      {
        error: 'not_configured',
        message:
          'OPENAI_API_KEY is not set. The administrator must configure the function.',
      },
      503,
    );
  }

  let stats: StatsPayload;
  try {
    stats = (await req.json()) as StatsPayload;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const locale = stats.locale ?? 'en';
  const languageName = LANGUAGE_NAMES[locale] ?? 'English';

  const systemPrompt =
    `You are an experienced, supportive FX (forex) trading coach. ` +
    `Analyze the trader's aggregate statistics and respond ENTIRELY in ${languageName}. ` +
    `Give 3 to 5 concrete, actionable insights and improvement suggestions. ` +
    `Focus on weaknesses (e.g. risk management, losing pairs, low profit factor, long losing streaks) ` +
    `and reinforce strengths. Be specific and reference the numbers. ` +
    `Format as a short numbered list. Do not give financial advice or guarantees; ` +
    `frame everything as educational coaching. Keep it concise.`;

  const userPrompt = `Here are the trader's statistics:\n\n${buildPrompt(stats)}`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: 'openai_error', detail }, 502);
    }

    const data = await resp.json();
    const feedback: string =
      data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!feedback) {
      return json({ error: 'empty_response' }, 502);
    }

    return json({ feedback });
  } catch (e) {
    return json({ error: 'request_failed', detail: String(e) }, 502);
  }
});
