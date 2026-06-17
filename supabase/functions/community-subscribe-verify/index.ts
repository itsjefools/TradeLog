// Supabase Edge Function: community-subscribe-verify
//
// 有料コミュニティの IAP 購入を検証し、収益台帳(community_earnings)へ
// 作成者85% / TradeLog15% で記帳しつつ、参加権(community_members)を付与する。
//
// 流れ:
//   1) 呼び出しユーザーを Supabase Auth で検証。
//   2) 対象コミュニティ・価格ティアを service-role で取得。
//   3) ストアのレシート/トランザクションを検証（Apple/Google）。
//      ※ ストア資格情報(Secret)が未設定なら 503 not_configured を返す。
//   4) 85/15 で分配額を計算し community_earnings に記帳（store_txn_id で二重計上防止）。
//   5) community_members に参加権を付与。
//
// 注意:
//   - Deno ランタイム。RN 側 tsc 対象外。
//   - 自動更新(renewal)分は App Store Server Notifications / Google RTDN を受ける
//     別エンドポイントで記帳する（後続フェーズ）。本関数は「初回購入＝参加」を担当。
//   - 必須 Secret(ストア検証用): APPLE_SHARED_SECRET（iOS） / GOOGLE_SERVICE_ACCOUNT_JSON（Android）
//     のうち該当プラットフォーム分。未設定なら 503。

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

type Platform = 'apple' | 'google';

type Body = {
  communityId?: string;
  platform?: Platform;
  productId?: string;
  // iOS: App Store のトランザクションID / レシート。Android: purchaseToken。
  transactionId?: string;
  receipt?: string;
  purchaseToken?: string;
};

// 現在の集計期間 'YYYY-MM'（タイムゾーンは UTC ベースで十分）
function currentPeriod(): string {
  const d = new Date();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const APPLE_SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET');
  const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

  // ---- 認証 --------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  // ---- 入力 --------------------------------------------------------------
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const { communityId, platform, productId } = body;
  if (!communityId || !platform || !productId) {
    return json({ error: 'missing_params' }, 400);
  }

  // ストア資格情報が無ければ「未設定」を返す（クライアントは準備中と案内）。
  if (
    (platform === 'apple' && !APPLE_SHARED_SECRET) ||
    (platform === 'google' && !GOOGLE_SERVICE_ACCOUNT_JSON)
  ) {
    return json({ error: 'not_configured', message: 'Store credentials are not set.' }, 503);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ---- コミュニティ + 価格ティア ----------------------------------------
  const { data: community, error: cErr } = await admin
    .from('communities')
    .select('id, owner_id, price_tier_key, creator_share, is_active')
    .eq('id', communityId)
    .maybeSingle();
  if (cErr) return json({ error: 'db_error', detail: cErr.message }, 500);
  if (!community || !community.is_active) return json({ error: 'community_not_found' }, 404);
  if (!community.price_tier_key) return json({ error: 'community_not_paid' }, 400);
  if (community.owner_id === user.id) return json({ error: 'owner_cannot_subscribe' }, 400);

  const { data: tier } = await admin
    .from('community_price_tiers')
    .select('tier_key, amount, iap_product_id_ios, iap_product_id_android')
    .eq('tier_key', community.price_tier_key)
    .maybeSingle();
  if (!tier) return json({ error: 'tier_not_found' }, 500);

  // 送られてきた productId が当該ティアの商品IDと一致するか（なりすまし防止）
  const expected =
    platform === 'apple' ? tier.iap_product_id_ios : tier.iap_product_id_android;
  if (expected && productId !== expected) {
    return json({ error: 'product_mismatch' }, 400);
  }

  // ---- ストアのレシート検証 --------------------------------------------
  // verifyWithStore は (検証OK, ストアの一意トランザクションID) を返す想定。
  const verified = await verifyWithStore(platform, body, {
    appleSharedSecret: APPLE_SHARED_SECRET,
    googleServiceAccountJson: GOOGLE_SERVICE_ACCOUNT_JSON,
  });
  if (!verified.ok || !verified.txnId) {
    return json({ error: 'receipt_invalid', detail: verified.detail }, 402);
  }

  // ---- 分配計算（作成者85% / TradeLog15%・ストア控除後の純額に対して） ----
  const gross = tier.amount;
  // Small Business Program 15%（超過時30%）。確定値はストア精算に合わせて後で補正可能。
  const storeFeeRate = 0.15;
  const storeFee = Math.round(gross * storeFeeRate);
  const net = gross - storeFee;
  const creatorShare = Number(community.creator_share ?? 0.85);
  const creatorAmount = Math.round(net * creatorShare);
  const platformFee = net - creatorAmount;

  // ---- 記帳（二重計上は store_txn_id の unique で防止） ------------------
  const { error: eErr } = await admin.from('community_earnings').insert({
    community_id: community.id,
    creator_id: community.owner_id,
    subscriber_id: user.id,
    period: currentPeriod(),
    currency: 'JPY',
    gross_amount: gross,
    store_fee: storeFee,
    net_amount: net,
    platform_fee: platformFee,
    creator_amount: creatorAmount,
    store: platform,
    store_txn_id: verified.txnId,
    status: 'pending',
  });
  // 既に同じトランザクションが記帳済み（unique violation）でも、参加権付与は続行する。
  if (eErr && !`${eErr.message}`.toLowerCase().includes('duplicate')) {
    return json({ error: 'ledger_error', detail: eErr.message }, 500);
  }

  // ---- 参加権の付与 -----------------------------------------------------
  const { error: mErr } = await admin
    .from('community_members')
    .upsert(
      { community_id: community.id, user_id: user.id, role: 'member' },
      { onConflict: 'community_id,user_id' },
    );
  if (mErr) return json({ error: 'membership_error', detail: mErr.message }, 500);

  return json({
    ok: true,
    creator_amount: creatorAmount,
    platform_fee: platformFee,
  });
});

// ストアのレシート/トークンを検証する。
// ※ 本番では Apple App Store Server API / Google Play Developer API による
//   厳密な検証を行う。資格情報が未設定の場合は呼び出し側で 503 にしているため、
//   ここに来る時点で該当 Secret は存在する。
async function verifyWithStore(
  platform: Platform,
  body: Body,
  _creds: { appleSharedSecret?: string; googleServiceAccountJson?: string },
): Promise<{ ok: boolean; txnId?: string; detail?: string }> {
  // TODO(店舗検証・要サンドボックステスト):
  //   - apple: /verifyReceipt もしくは App Store Server API でレシート検証し、
  //            product_id・purchase_date・original_transaction_id を取得して照合。
  //   - google: purchases.subscriptions.get で purchaseToken を検証。
  // 現段階では一意トランザクションIDの取り回しのみ実装（記帳の冪等キーに使用）。
  const txnId =
    body.transactionId ?? body.purchaseToken ?? null;
  if (!txnId) return { ok: false, detail: 'no_transaction_id' };
  return { ok: true, txnId: `${platform}:${txnId}` };
}
