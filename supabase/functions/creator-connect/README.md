# creator-connect — 作成者ペイアウト（Stripe Connect）

有料コミュニティ作成者の受取口座を Stripe Connect（Express）で扱う Edge Function。
口座情報・本人確認は Stripe が保持し、自社 DB には `stripe_account_id` と状態のみ持つ。

## エンドポイント
`POST /functions/v1/creator-connect`（`Authorization: Bearer <user JWT>`）

- `{ "action": "link" }` → `{ "url": "<StripeオンボーディングURL>" }`
  - Express アカウントを無ければ作成し、`account_onboarding` リンクを返す。
- `{ "action": "status" }` → `{ "status": "verified|pending|unverified", "payouts_enabled": bool }`
  - Stripe からアカウント状態を取得し、`creator_payout_accounts`（payouts_enabled / details_submitted / status）を更新。

## 必須 Secret
- `STRIPE_SECRET_KEY`
- `CONNECT_RETURN_URL`（任意・既定はアプリのホームページ。オンボ後の戻り先 https URL）

未設定なら `503 not_configured`（クライアントは「準備中」表示）。

## セットアップ（Jeff）
1. Stripe ダッシュボードで **Connect** を有効化（プラットフォーム設定・Express）。
2. `supabase secrets set STRIPE_SECRET_KEY=sk_live_... CONNECT_RETURN_URL=https://...`
3. `supabase functions deploy creator-connect`
4. SQL `0074` 適用。

## 送金（本関数の範囲外・運用）
実際の作成者への送金は、`community_earnings`(status=pending) を集計し、Stripe の
**Transfers/Payouts** を connected account 宛に実行する運用バッチで行う（`creator_payouts` に記録）。
これは資金移動のためアプリからは自動実行せず、運用側で実施する。

⚠️ **未テスト。** Connect 有効化後、Stripe テストモードでオンボーディング→ payouts_enabled
までを確認すること。オンボ戻りは現状ホームページに戻るため、アプリには手動復帰→状態更新となる
（より滑らかにするには `tradelog://` へ橋渡しする https リダイレクトページを用意）。
