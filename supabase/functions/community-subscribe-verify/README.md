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
  - iOS:     `APPLE_SHARED_SECRET`
  - Android: `GOOGLE_SERVICE_ACCOUNT_JSON`
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
- ⚠️ **TODO（要サンドボックステスト）**: `verifyWithStore` の本実装。
  - apple: App Store Server API / verifyReceipt でレシート検証 → product_id・購入日・
    original_transaction_id を照合。
  - google: purchases.subscriptions.get で purchaseToken を検証。
  - 自動更新(renewal)分は App Store Server Notifications / Google RTDN を受ける
    別エンドポイントで記帳する（後続フェーズ）。

## デプロイ

```sh
supabase secrets set APPLE_SHARED_SECRET=...
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
supabase functions deploy community-subscribe-verify
```
