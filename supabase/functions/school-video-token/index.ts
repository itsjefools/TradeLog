// Supabase Edge Function: school-video-token
//
// NewsPicks 型の「アプリ限定・有料会員のみ視聴できる Premium 動画」を実現するための
// 署名付き再生トークン発行エンドポイント。
//
// 流れ:
//   1) 呼び出しユーザーを Supabase Auth で検証（未ログインは 401）。
//   2) 対象動画(school_videos)を service-role で取得。cloudflare 動画のみ対象。
//   3) Premium動画(is_free=false)なら、サーバ側で会員判定（profiles.plan_tier /
//      bonus_premium_until / user_subscriptions のいずれか）。非会員は 403。
//   4) Cloudflare Stream の署名付きトークンを発行し、HLS マニフェスト URL を返す。
//      署名鍵(APIトークン)はサーバにのみ置き、クライアントには短命の URL だけ渡す。
//
// 注意:
//   - Deno ランタイム。React Native 側の tsc 対象外。
//   - 必須 Secret: CF_ACCOUNT_ID / CF_STREAM_API_TOKEN / CF_CUSTOMER_CODE
//     （未設定なら 503 not_configured を返し、クライアントは「準備中」と案内する）
//   - SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY は自動注入。
//
// デプロイ手順は同ディレクトリの README.md を参照。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// 署名URLの有効期限（秒）。短命にしてリンク漏れの被害を限定する。
const TOKEN_TTL_SECONDS = 4 * 60 * 60; // 4時間

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID');
  const CF_STREAM_API_TOKEN = Deno.env.get('CF_STREAM_API_TOKEN');
  const CF_CUSTOMER_CODE = Deno.env.get('CF_CUSTOMER_CODE');

  if (!CF_ACCOUNT_ID || !CF_STREAM_API_TOKEN || !CF_CUSTOMER_CODE) {
    // 未設定: クライアントが「準備中（管理者の設定が必要）」と表示できるよう 503。
    return json(
      {
        error: 'not_configured',
        message: 'Cloudflare Stream secrets are not set.',
      },
      503,
    );
  }

  // ---- 1) 認証ユーザーの検証 ---------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'unauthorized' }, 401);
  }

  // ---- 入力 --------------------------------------------------------------
  let videoId: string;
  try {
    const body = (await req.json()) as { videoId?: string };
    if (!body.videoId) return json({ error: 'missing_video_id' }, 400);
    videoId = body.videoId;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ---- 2) 動画の取得 -----------------------------------------------------
  const { data: video, error: vErr } = await admin
    .from('school_videos')
    .select('id, video_source, stream_uid, is_free')
    .eq('id', videoId)
    .maybeSingle();

  if (vErr) return json({ error: 'db_error', detail: vErr.message }, 500);
  if (!video) return json({ error: 'not_found' }, 404);
  if (video.video_source !== 'cloudflare') {
    // 無料(YouTube)動画はこのエンドポイントを使わない。
    return json({ error: 'not_a_hosted_video' }, 400);
  }
  if (!video.stream_uid) {
    return json({ error: 'misconfigured_video' }, 500);
  }

  // ---- 3) Premium動画なら会員判定 ---------------------------------------
  if (!video.is_free) {
    const premium = await isPremium(admin, user.id);
    if (!premium) return json({ error: 'premium_required' }, 403);
  }

  // ---- 4) Cloudflare Stream 署名付きトークンの発行 -----------------------
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const tokenResp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${video.stream_uid}/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ exp, downloadable: false }),
    },
  );

  if (!tokenResp.ok) {
    const detail = await tokenResp.text();
    return json({ error: 'cloudflare_error', detail }, 502);
  }
  const tokenData = await tokenResp.json();
  const token: string | undefined = tokenData?.result?.token;
  if (!token) return json({ error: 'no_token' }, 502);

  const base = `https://customer-${CF_CUSTOMER_CODE}.cloudflarestream.com/${token}`;
  return json({
    url: `${base}/manifest/video.m3u8`,
    poster: `${base}/thumbnails/thumbnail.jpg`,
    expiresAt: exp,
  });
});

// profiles / user_subscriptions を見て Plus 以上かを判定する。
// （plus/pro どちらも Plus 以上なので、有効サブスクの存在チェックで足りる）
async function isPremium(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from('profiles')
    .select('plan_tier, bonus_premium_until')
    .eq('id', userId)
    .maybeSingle();

  const tier = (profile?.plan_tier as string | null) ?? 'free';
  if (tier === 'plus' || tier === 'pro') return true;

  const bonus = profile?.bonus_premium_until as string | null;
  if (bonus && new Date(bonus).getTime() > Date.now()) return true;

  const nowIso = new Date().toISOString();
  const { data: subs } = await admin
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', nowIso)
    .limit(1);

  return !!subs && subs.length > 0;
}
