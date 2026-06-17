# community-renewal-webhook — 有料コミュニティの自動更新を記帳

Apple / Google のサブスク更新通知を受け取り、対象コミュニティの収益(community_earnings)へ
作成者85% / TradeLog15% で追加記帳する Edge Function。

## 概要

- ランタイム: Deno
- エンドポイント: `POST /functions/v1/community-renewal-webhook`
- 受信:
  - **Apple** App Store Server Notifications V2 … `{ signedPayload }`
  - **Google** Realtime Developer Notifications（Pub/Sub push）… `{ message: { data } }`
- 記帳対象: Apple `DID_RENEW` / Google `RENEWED(2)`・`RECOVERED(1)`
  （初回購入は `community-subscribe-verify` が記帳済みなので除外）

## セキュリティ

- 通知の中身を信用せず、**ストアに再問い合わせして検証**してから記帳する。
  - Apple: 通知の transactionId → App Store Server API `GET /inApps/v1/transactions/{id}` で再取得。
  - Google: purchaseToken → `purchases.subscriptions.get` で再検証。
- 「どのコミュニティの課金か」は初回購入時に保存した `community_subscriptions` から引く
  （Apple=original_transaction_id / Google=purchase_token）。
- 二重計上は `community_earnings.store_txn_id` の unique で防止。

## 必須 Secret

- Apple: `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`(.p8の内容) / `APPLE_BUNDLE_ID`
- Google: `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_PACKAGE_NAME`（既定 `com.kingjay.tradelog`）

## 設定（ストア側）

- Apple: App Store Connect → App → 「App Store Server Notifications」の Production/Sandbox URL に
  このエンドポイントを登録。
- Google: Play Console → 収益化 → リアルタイム デベロッパー通知 で Pub/Sub トピックを設定し、
  そのトピックの push サブスクリプション先にこのエンドポイントを指定。

## デプロイ

```sh
supabase secrets set APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_BUNDLE_ID=com.kingjay.tradelog
supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
# Google は community-subscribe-verify と同じ Secret を共用
supabase functions deploy community-renewal-webhook
```

⚠️ **未テスト。サンドボックス/実機テスト必須。** StoreKit2 で JWS しか取れない構成や、
解約・返金(REFUND/REVOKE)時の `status` 更新・按分返金は後続フェーズ。
