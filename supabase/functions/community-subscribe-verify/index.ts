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

// Android アプリのパッケージ名（Google Play 検証で使用）
const GOOGLE_PACKAGE_NAME = Deno.env.get('GOOGLE_PACKAGE_NAME') ?? 'com.kingjay.tradelog';

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
  const verified =
    platform === 'apple'
      ? await verifyApple(body.receipt ?? '', APPLE_SHARED_SECRET!, productId)
      : await verifyGoogle(
          GOOGLE_SERVICE_ACCOUNT_JSON!,
          GOOGLE_PACKAGE_NAME,
          productId,
          body.purchaseToken ?? '',
        );
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

type VerifyResult = { ok: boolean; txnId?: string; detail?: string };

// ---- Apple: verifyReceipt（本番→サンドボックスの順で検証） ----------------
async function verifyApple(
  receipt: string,
  sharedSecret: string,
  productId: string,
): Promise<VerifyResult> {
  if (!receipt) return { ok: false, detail: 'no_receipt' };
  const payload = JSON.stringify({
    'receipt-data': receipt,
    password: sharedSecret,
    'exclude-old-transactions': true,
  });
  const post = (url: string) =>
    fetch(url, { method: 'POST', body: payload }).then((r) => r.json());

  let data = await post('https://buy.itunes.apple.com/verifyReceipt');
  // 21007 = サンドボックスのレシートを本番に送った → サンドボックスで再検証
  if (data.status === 21007) {
    data = await post('https://sandbox.itunes.apple.com/verifyReceipt');
  }
  if (data.status !== 0) return { ok: false, detail: `apple_status_${data.status}` };

  const infos: Record<string, unknown>[] =
    (data.latest_receipt_info as Record<string, unknown>[]) ??
    (data.receipt?.in_app as Record<string, unknown>[]) ??
    [];
  const matches = infos
    .filter((i) => i.product_id === productId)
    .sort(
      (a, b) =>
        Number(b.purchase_date_ms ?? 0) - Number(a.purchase_date_ms ?? 0),
    );
  const match = matches[0];
  if (!match) return { ok: false, detail: 'apple_no_matching_product' };

  const txnId =
    (match.original_transaction_id as string) ?? (match.transaction_id as string);
  if (!txnId) return { ok: false, detail: 'apple_no_txn_id' };
  return { ok: true, txnId: `apple:${txnId}` };
}

// ---- Google Play: purchases.subscriptions.get ----------------------------
async function verifyGoogle(
  serviceAccountJson: string,
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<VerifyResult> {
  if (!purchaseToken) return { ok: false, detail: 'no_purchase_token' };
  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    return { ok: false, detail: 'bad_service_account' };
  }
  const accessToken = await getGoogleAccessToken(sa);
  if (!accessToken) return { ok: false, detail: 'google_auth_failed' };

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/subscriptions/${productId}/tokens/` +
    encodeURIComponent(purchaseToken);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { ok: false, detail: `google_${res.status}` };
  const data = await res.json();

  // paymentState: 0=保留, 1=受領, 2=無料トライアル, 3=保留中アップグレード/ダウングレード
  if (data.paymentState !== undefined && data.paymentState === 0) {
    return { ok: false, detail: 'google_payment_pending' };
  }
  const txnId = (data.orderId as string) ?? purchaseToken;
  return { ok: true, txnId: `google:${txnId}` };
}

// サービスアカウントの JWT を署名して OAuth2 アクセストークンを取得する。
async function getGoogleAccessToken(sa: {
  client_email: string;
  private_key: string;
}): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await importPkcs8(sa.private_key);
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlBytes(new Uint8Array(sigBuf))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      `grant_type=${encodeURIComponent(
        'urn:ietf:params:oauth:grant-type:jwt-bearer',
      )}&assertion=${jwt}`,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.access_token as string) ?? null;
}

// PEM(PKCS8) の秘密鍵を crypto キーに取り込む。
async function importPkcs8(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (ch) => ch.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
