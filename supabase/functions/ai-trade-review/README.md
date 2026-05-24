# ai-trade-review — AIトレード添削 Edge Function

ユーザーの取引統計サマリを受け取り、OpenAI を使って
トレードコーチとしての気づき・改善提案を生成して返す Supabase Edge Function。

## 概要

- ランタイム: Deno（Supabase Edge Functions）
- エンドポイント: `POST /functions/v1/ai-trade-review`
- リクエストボディ（JSON）: 統計サマリ + `locale`
  - `totalPnl`, `winRate`, `totalTrades`, `profitFactor`,
    `avgWin`, `avgLoss`, `maxWin`, `maxLoss`, `winStreak`, `loseStreak`,
    `byPair[]`, `byTag[]`, `locale`（`ja` / `en` / `pt` / `es`）
- レスポンス（JSON）: `{ "feedback": "..." }`
- 必須環境変数: `OPENAI_API_KEY`
  - 未設定の場合は `503` と `{ "error": "not_configured", ... }` を返す。
    クライアントはこれを catch して「準備中（管理者の設定が必要）」と案内する。

## デプロイ手順

1. Supabase CLI をインストール・ログイン済みであること。

   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

2. OpenAI の API キーを Secret として登録する。

   ```sh
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

3. 関数をデプロイする。

   ```sh
   supabase functions deploy ai-trade-review
   ```

## 動作確認（任意）

```sh
curl -i -X POST \
  "https://<your-project-ref>.functions.supabase.co/ai-trade-review" \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"totalTrades":42,"winRate":55.2,"totalPnl":123000,"profitFactor":1.8,"locale":"ja"}'
```

`OPENAI_API_KEY` 未設定時は `503` が返り、アプリ側は「準備中」表示になる。

## 使用モデル

`gpt-4o-mini`（`index.ts` 内で変更可能）。
