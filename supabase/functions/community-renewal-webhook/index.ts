// Supabase Edge Function: community-renewal-webhook
//
// 有料コミュニティの「自動更新(renewal)」をストア通知で受け取り、
// 対象コミュニティの収益(community_earnings)に作成者85%/TradeLog15%で追加記帳する。
//
// 受け取る通知:
//   - Apple: App Store Server Notifications V2（body.signedPayload = JWS）
//   - Google: Realtime Developer Notifications（Pub/Sub push: body.message.data = base64 JSON）
//
// セキュリティ: 通知の中身を信用せず、**ストアに再問い合わせして検証**してから記帳する。
//   - Apple: 通知から transactionId を取り出し、App Store Server API で取引情報を再取得。
//   - Google: purchaseToken を purchases.subscriptions.get で再検証。
// 「どのコミュニティの課金か」は初回購入時に保存した community_subscriptions から引く。
// 二重計上は community_earnings.store_txn_id の unique で防止。
//
// 必須 Secret:
//   Apple : APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY(.p8) / APPLE_BUNDLE_ID
//   Google: GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_PACKAGE_NAME(既定 com.kingjay.tradelog)
//   ⚠️ 未テスト。サンドボックス/実機テスト必須。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STORE_FEE_RATE = 0.15;
const GOOGLE_PACKAGE_NAME =
  Deno.env.get('GOOGLE_PACKAGE_NAME') ?? 'com.kingjay.tradelog';

type Admin = ReturnType<typeof createClient>;

function ok(): Response {
  return new Response('ok', { status: 200 });
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  try {
    if (typeof body.signedPayload === 'string') {
      await handleApple(admin, body.signedPayload);
    } else if (body.message && typeof (body.message as { data?: string }).data === 'string') {
      await handleGoogle(admin, (body.message as { data: string }).data);
    }
  } catch (e) {
    // 5xx を返すとストアが再送する。記帳失敗は再送させたいので 500。
    return new Response(`error: ${String(e)}`, { status: 500 });
  }
  // 対象外通知/マッピング無しでも 200（再送不要）。
  return ok();
});

// ===========================================================================
// Apple
// ===========================================================================
async function handleApple(admin: Admin, signedPayload: string): Promise<void> {
  const notif = decodeJws(signedPayload) as {
    notificationType?: string;
    data?: { signedTransactionInfo?: string };
  } | null;
  if (!notif) return;
  // 更新系のみ記帳（初回 SUBSCRIBED は subscribe-verify が記帳済み）。
  if (notif.notificationType !== 'DID_RENEW') return;

  const signedTxn = notif.data?.signedTransactionInfo;
  if (!signedTxn) return;
  const peek = decodeJws(signedTxn) as { transactionId?: string } | null;
  const transactionId = peek?.transactionId;
  if (!transactionId) return;

  // App Store Server API で取引を再取得（信頼できる情報）。
  const txn = await appleGetTransaction(transactionId);
  if (!txn) return;
  const originalTransactionId = txn.originalTransactionId ?? '';
  if (!originalTransactionId) return;

  const { data: sub } = await admin
    .from('community_subscriptions')
    .select('community_id, creator_id, subscriber_id, price_tier_key')
    .eq('store', 'apple')
    .eq('original_transaction_id', originalTransactionId)
    .maybeSingle();
  if (!sub) return;

  await recordRenewal(admin, sub, 'apple', `apple:${transactionId}`);
}

// App Store Server API: 取引情報を取得（本番→サンドボックス）。
async function appleGetTransaction(
  transactionId: string,
): Promise<{ originalTransactionId?: string; productId?: string } | null> {
  const jwt = await appleApiJwt();
  if (!jwt) return null;
  const hosts = [
    'https://api.storekit.itunes.apple.com',
    'https://api.storekit-sandbox.itunes.apple.com',
  ];
  for (const host of hosts) {
    const res = await fetch(`${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) {
      const data = await res.json();
      const info = decodeJws(data.signedTransactionInfo) as
        | { originalTransactionId?: string; productId?: string }
        | null;
      if (info) return info;
    }
  }
  return null;
}

// App Store Server API 用の ES256 JWT を作る。
async function appleApiJwt(): Promise<string | null> {
  const issuer = Deno.env.get('APPLE_ISSUER_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const pem = Deno.env.get('APPLE_PRIVATE_KEY');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  if (!issuer || !keyId || !pem || !bundleId) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: issuer,
      iat: now,
      exp: now + 3000,
      aud: 'appstoreconnect-v1',
      bid: bundleId,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const key = await importPkcs8(pem, 'ECDSA', 'P-256');
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${b64urlBytes(new Uint8Array(sig))}`;
}

// ===========================================================================
// Google
// ===========================================================================
async function handleGoogle(admin: Admin, dataB64: string): Promise<void> {
  const json = new TextDecoder().decode(b64decode(dataB64));
  const msg = JSON.parse(json) as {
    subscriptionNotification?: {
      purchaseToken?: string;
      subscriptionId?: string;
      notificationType?: number;
    };
  };
  const n = msg.subscriptionNotification;
  if (!n?.purchaseToken || !n.subscriptionId) return;
  // 1=RECOVERED, 2=RENEWED のみ記帳（4=PURCHASED は subscribe-verify が記帳済み）。
  if (n.notificationType !== 2 && n.notificationType !== 1) return;

  const verified = await googleGetSubscription(n.subscriptionId, n.purchaseToken);
  if (!verified) return;

  const { data: sub } = await admin
    .from('community_subscriptions')
    .select('community_id, creator_id, subscriber_id, price_tier_key')
    .eq('store', 'google')
    .eq('purchase_token', n.purchaseToken)
    .maybeSingle();
  if (!sub) return;

  await recordRenewal(admin, sub, 'google', `google:${verified.orderId}`);
}

async function googleGetSubscription(
  subscriptionId: string,
  purchaseToken: string,
): Promise<{ orderId: string } | null> {
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!saJson) return null;
  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(saJson);
  } catch {
    return null;
  }
  const token = await googleAccessToken(sa);
  if (!token) return null;
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${GOOGLE_PACKAGE_NAME}/purchases/subscriptions/${subscriptionId}/tokens/` +
    encodeURIComponent(purchaseToken);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  // renewal ごとに orderId は ...0, ...1 と一意。冪等キーに使える。
  return { orderId: (data.orderId as string) ?? purchaseToken };
}

async function googleAccessToken(sa: {
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
  const key = await importPkcs8(sa.private_key, 'RSASSA-PKCS1-v1_5', undefined);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlBytes(new Uint8Array(sig))}`;
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

// ===========================================================================
// 共通: 更新分の記帳（85/15）
// ===========================================================================
async function recordRenewal(
  admin: Admin,
  sub: {
    community_id: string;
    creator_id: string;
    subscriber_id: string;
    price_tier_key: string | null;
  },
  store: 'apple' | 'google',
  storeTxnId: string,
): Promise<void> {
  if (!sub.price_tier_key) return;
  const [{ data: tier }, { data: community }] = await Promise.all([
    admin
      .from('community_price_tiers')
      .select('amount')
      .eq('tier_key', sub.price_tier_key)
      .maybeSingle(),
    admin
      .from('communities')
      .select('creator_share')
      .eq('id', sub.community_id)
      .maybeSingle(),
  ]);
  if (!tier) return;

  const gross = tier.amount as number;
  const storeFee = Math.round(gross * STORE_FEE_RATE);
  const net = gross - storeFee;
  const creatorShare = Number(community?.creator_share ?? 0.85);
  const creatorAmount = Math.round(net * creatorShare);
  const platformFee = net - creatorAmount;

  const { error } = await admin.from('community_earnings').insert({
    community_id: sub.community_id,
    creator_id: sub.creator_id,
    subscriber_id: sub.subscriber_id,
    period: currentPeriod(),
    currency: 'JPY',
    gross_amount: gross,
    store_fee: storeFee,
    net_amount: net,
    platform_fee: platformFee,
    creator_amount: creatorAmount,
    store,
    store_txn_id: storeTxnId,
    status: 'pending',
  });
  // 二重計上(unique)は握りつぶす。それ以外は投げて再送させる。
  if (error && !`${error.message}`.toLowerCase().includes('duplicate')) {
    throw new Error(error.message);
  }
}

// ===========================================================================
// 共通ユーティリティ（JWS デコード・base64url・鍵取り込み）
// ===========================================================================
function decodeJws(jws: string | undefined): unknown {
  if (!jws) return null;
  const parts = jws.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64decode(parts[1])));
  } catch {
    return null;
  }
}

function b64decode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? norm : norm + '='.repeat(4 - (norm.length % 4));
  return Uint8Array.from(atob(pad), (ch) => ch.charCodeAt(0));
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPkcs8(
  pem: string,
  name: string,
  namedCurve?: string,
): Promise<CryptoKey> {
  const der = b64decode(
    pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, ''),
  );
  const algo: EcKeyImportParams | RsaHashedImportParams = namedCurve
    ? { name, namedCurve }
    : { name, hash: 'SHA-256' };
  return crypto.subtle.importKey('pkcs8', der, algo, false, ['sign']);
}
