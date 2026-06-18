// Supabase Edge Function: creator-connect
//
// 作成者ペイアウトの Stripe Connect（Express）連携。
//   action 'link'   … Express アカウントを用意し、オンボーディング用リンクを返す
//   action 'status' … Stripe からアカウント状態を取得し、DB(payouts_enabled 等)を更新して返す
//
// 口座情報・本人確認は Stripe 側が保持する（自社 DB には stripe_account_id と状態のみ）。
// 実際の送金(Transfer/Payout)は別の運用バッチで Stripe API を叩いて行う（本関数の範囲外）。
//
// 必須 Secret:
//   STRIPE_SECRET_KEY          … Stripe のシークレットキー
//   CONNECT_RETURN_URL (任意)  … オンボーディング後の戻り先 https URL
//                                （既定: アプリのホームページ）
// （SUPABASE_URL / ANON / SERVICE_ROLE は自動注入）
//
// ⚠️ 未テスト。Stripe ダッシュボードで Connect を有効化し、本番前にテストすること。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Stripe REST 呼び出し（application/x-www-form-urlencoded）。
async function stripe(
  key: string,
  path: string,
  method: 'GET' | 'POST',
  form?: Record<string, string>,
): Promise<Response> {
  return fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  const RETURN_URL =
    Deno.env.get('CONNECT_RETURN_URL') ?? 'https://itsjefools.github.io/TradeLog/';

  if (!STRIPE_KEY) return json({ error: 'not_configured' }, 503);

  // 認証ユーザー
  const authClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  let action = 'status';
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action) action = body.action;
  } catch {
    /* status by default */
  }

  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false },
  });

  // 既存アカウントを取得
  const { data: acct } = await admin
    .from('creator_payout_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();
  let stripeAccountId = (acct?.stripe_account_id as string | null) ?? null;

  // ---- アカウント作成（無ければ） --------------------------------------
  if (!stripeAccountId) {
    const res = await stripe(STRIPE_KEY, 'accounts', 'POST', {
      type: 'express',
      country: 'JP',
      'capabilities[transfers][requested]': 'true',
      'metadata[user_id]': user.id,
    });
    if (!res.ok) return json({ error: 'stripe_error', detail: await res.text() }, 502);
    const acc = await res.json();
    stripeAccountId = acc.id as string;
    await admin.from('creator_payout_accounts').upsert(
      {
        user_id: user.id,
        method: 'stripe',
        stripe_account_id: stripeAccountId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }

  // ---- status: Stripe から状態取得して DB 同期 -------------------------
  if (action === 'status') {
    const res = await stripe(STRIPE_KEY, `accounts/${stripeAccountId}`, 'GET');
    if (!res.ok) return json({ error: 'stripe_error', detail: await res.text() }, 502);
    const acc = await res.json();
    const payoutsEnabled = !!acc.payouts_enabled;
    const detailsSubmitted = !!acc.details_submitted;
    const status = payoutsEnabled
      ? 'verified'
      : detailsSubmitted
        ? 'pending'
        : 'unverified';
    await admin
      .from('creator_payout_accounts')
      .update({
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    return json({ status, payouts_enabled: payoutsEnabled });
  }

  // ---- link: オンボーディングURLを発行 --------------------------------
  const res = await stripe(STRIPE_KEY, 'account_links', 'POST', {
    account: stripeAccountId,
    refresh_url: RETURN_URL,
    return_url: RETURN_URL,
    type: 'account_onboarding',
  });
  if (!res.ok) return json({ error: 'stripe_error', detail: await res.text() }, 502);
  const link = await res.json();
  return json({ url: link.url as string });
});
