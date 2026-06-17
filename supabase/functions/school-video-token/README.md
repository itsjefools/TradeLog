# school-video-token — Premium動画 署名URL発行 Edge Function

NewsPicks 型の「アプリ限定・有料会員のみ視聴できる Premium 動画」を実現するための
Supabase Edge Function。会員を検証し、Cloudflare Stream の**署名付き再生URL**（短命）を返す。

## 概要

- ランタイム: Deno（Supabase Edge Functions）
- エンドポイント: `POST /functions/v1/school-video-token`
- リクエスト: `{ "videoId": "<school_videos.id>" }` ＋ `Authorization: Bearer <user JWT>`
- レスポンス: `{ "url": "<HLS .m3u8>", "poster": "...", "expiresAt": <unix> }`
- 必須 Secret:
  - `CF_ACCOUNT_ID` … Cloudflare アカウントID
  - `CF_STREAM_API_TOKEN` … Stream のトークン発行権限を持つ API トークン
  - `CF_CUSTOMER_CODE` … 配信サブドメイン `customer-<code>.cloudflarestream.com` の `<code>`
  - （`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` は自動注入）
- 認可:
  - 未ログイン → `401`
  - 対象が `cloudflare` 動画でない → `400`
  - Premium動画(`is_free=false`)で非会員 → `403`
  - Secret 未設定 → `503 not_configured`（クライアントは「準備中」と表示）

## Cloudflare 側のセットアップ（Jeff）

1. Cloudflare アカウントを作成し、**Stream** を有効化する。
2. Premium 動画をアップロードする（ダッシュボード or API）。各動画に **UID** が付く
   → これを `school_videos.stream_uid` に入れる（`video_source='cloudflare'`, `is_free=false`）。
3. 各 Premium 動画の **「Require signed URLs（署名付きURLを必須にする）」を ON**。
   - これを忘れると署名なしで誰でも見られてしまう（最重要）。
4. **API トークン**を発行（Stream の Read／トークン発行が可能な権限）。→ `CF_STREAM_API_TOKEN`
5. ダッシュボードの配信ドメイン `customer-<code>.cloudflarestream.com` の `<code>` を控える。→ `CF_CUSTOMER_CODE`
6. アカウントIDを控える。→ `CF_ACCOUNT_ID`

## デプロイ手順

```sh
supabase link --project-ref <your-project-ref>

# Secret 登録
supabase secrets set CF_ACCOUNT_ID=xxxxxxxx
supabase secrets set CF_STREAM_API_TOKEN=xxxxxxxx
supabase secrets set CF_CUSTOMER_CODE=xxxxxxxx

# デプロイ
supabase functions deploy school-video-token
```

## 動作確認（任意）

```sh
curl -i -X POST \
  "https://<project-ref>.functions.supabase.co/school-video-token" \
  -H "Authorization: Bearer <user-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"<cloudflare video row id>"}'
```

- Secret 未設定なら `503 not_configured`。
- 会員かつ正しい動画なら `{ "url": "...m3u8", ... }` が返り、アプリは expo-video で再生する。

## セキュリティ設計メモ

- Cloudflare の署名鍵（API トークン）は**サーバ(Secret)にのみ**置き、クライアントには
  短命（4時間）の署名URLだけ渡す。URL が漏れても期限切れで無効化される。
- 会員判定はクライアントを信用せず**サーバ側で再判定**（profiles / user_subscriptions）。
- 「Require signed URLs」が ON なら、署名なしの直リンクは Cloudflare 側で弾かれる。
