# community-subscribe-verify — 有料コミュニティ購入の検証・記帳

有料コミュニティの IAP 購入を検証し、収益台帳(community_earnings)へ
作成者85% / TradeLog15% で記帳しつつ、参加権(community_members)を付与する Edge Function。

## 概要

- ランタイム: Deno
- エンドポイント: `POST /functions/v1/community-subscribe-verify`
- リクエスト: `{ communityId, platform: 'apple'|'google', productId, transactionId?, purchaseToken? }`
  ＋ `Authorization: Bearer <user JWT>`
- レスポンス: `{ ok: true, creator_amount, platform_fee }`
- 必須 Secret（該当プラットフォーム分）:
  - iOS:     `APPLE_SHARED_SECRET`（App Store Connect の共有シークレット）
  - Android: `GOOGLE_SERVICE_ACCOUNT_JSON`（Play Developer API 権限つきサービスアカウントの鍵JSON）
  - 任意:    `GOOGLE_PACKAGE_NAME`（既定 `com.kingjay.tradelog`）
  - 未設定なら `503 not_configured`（クライアントは「準備中」と案内）

## 分配計算

```
gross(ティア額) → store_fee(15%) → net → creator(net*0.85) + platform(残り)
```
`store_fee` は Small Business Program の 15% を既定。100万ドル超で 30% に補正する。
`creator_share` は communities ごとに保持（既定 0.85）。

## 冪等性 / セキュリティ

- `community_earnings.store_txn_id` の unique 制約で二重計上を防止。
- 会員判定・分配計算・記帳はすべてサーバ側。クライアントは金額を送らない（ティア額はDB由来）。

## レシート検証（実装済み・要サンドボックステスト）

- **Apple**: `verifyReceipt`（本番→`21007`でサンドボックス自動フォールバック）。
  `latest_receipt_info` から `product_id` 一致の最新取引を探し `original_transaction_id` を採用。
  - ⚠️ クライアントは iOS の **base64 アプリレシート（`transactionReceipt`）** を `receipt` で送る。
    StoreKit2 で JWS しか取得できない構成では verifyReceipt が使えないため、その場合は
    App Store Server API への移行が必要（後続）。
- **Google**: サービスアカウントで OAuth2 トークンを取得し
  `purchases.subscriptions.get` で `purchaseToken` を検証（`paymentState` を確認）。
- ⚠️ **自動更新(renewal)** 分は App Store Server Notifications / Google RTDN を受ける
  別エンドポイントで記帳する（後続フェーズ・未実装）。
- ⚠️ **サンドボックス／実機テスト必須**（このコードは未テスト）。

## デプロイ

```sh
supabase secrets set APPLE_SHARED_SECRET=...
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
supabase functions deploy community-subscribe-verify
```
