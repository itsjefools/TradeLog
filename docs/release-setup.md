# リリース設定ガイド（Cloudflare / Edge Functions / IAP / Webhook）

TradeLog を本番稼働させるための外部設定・デプロイ手順を1枚にまとめたもの。
コード側は実装済み。以下は主に **Jeff さん側の設定・デプロイ・テスト**作業。

---

## 0. 前提
- Supabase CLI: `supabase login` → `supabase link --project-ref <ref>` 済み
- ビルド系コマンドは必ず `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`

## 1. SQL マイグレーション（適用順）
Supabase SQL Editor で番号順に実行（[[feedback_supabase_sql_manual]]）。**0067〜0073 は適用済み**想定。
未適用分があれば順に流す。

| # | 内容 |
|---|---|
| 0067 | 書籍アフィリタグ(itsjefools-22) |
| 0068 | Premium動画 Cloudflare 対応 (video_source/stream_uid) |
| 0069 | 動画カタログ投入（YT_REPLACE / CF_REPLACE は実IDに差し替えてから or 後でUPDATE） |
| 0070 | 旧テスト動画削除 |
| 0071 | 動画の多言語(en/pt/es) |
| 0072 | コミュニティ課金スキーマ（価格ティア/収益台帳/ペイアウト） |
| 0073 | コミュニティ サブスク マッピング |

## 2. Cloudflare Stream（Premium動画）
1. Cloudflare アカウント作成 → **Stream** 有効化
2. Premium動画をアップロード → 各動画の **UID** を取得
3. 各動画で **「Require signed URLs」を ON**（必須・忘れると無料で見られる）
4. `school_videos` の該当行を更新: `stream_uid='<UID>'`（`video_source='cloudflare'`, `is_free=false`）
5. 控える: **Account ID** / Stream用 **API Token** / 配信サブドメイン `customer-<code>` の `<code>`

## 3. 無料動画（YouTube）
- `school_videos` の `YT_REPLACE_1〜5` を実 YouTube 動画ID に UPDATE。

## 4. Edge Functions デプロイ（3本）

### a) school-video-token（Premium動画の署名URL）
```sh
supabase secrets set CF_ACCOUNT_ID=... CF_STREAM_API_TOKEN=... CF_CUSTOMER_CODE=...
supabase functions deploy school-video-token
```

### b) community-subscribe-verify（有料コミュ 初回購入の検証・記帳）
```sh
supabase secrets set APPLE_SHARED_SECRET=...
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
supabase secrets set GOOGLE_PACKAGE_NAME=com.kingjay.tradelog
supabase functions deploy community-subscribe-verify
```

### c) community-renewal-webhook（自動更新の記帳）
```sh
supabase secrets set APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_BUNDLE_ID=com.kingjay.tradelog
supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
# Google は b) と同じ Secret を共用
supabase functions deploy community-renewal-webhook
```

## 5. IAP 商品（App Store Connect / Google Play）
自動更新サブスクとして登録。商品IDは `lib/iap.ts` の定義に一致させること。

**Premium 階層**（既存）: `...plus.monthly/yearly`, `...pro.monthly/yearly`

**コミュニティ価格ティア**（新規・`COMMUNITY_PRODUCT_IDS`）:
| ティア | iOS 商品ID | Android 商品ID | 月額 |
|---|---|---|---|
| tier_480  | com.kingjay.tradelog.community.480  | community_480  | ¥480 |
| tier_980  | com.kingjay.tradelog.community.980  | community_980  | ¥980 |
| tier_1980 | com.kingjay.tradelog.community.1980 | community_1980 | ¥1,980 |
| tier_2980 | com.kingjay.tradelog.community.2980 | community_2980 | ¥2,980 |

登録後、`community_price_tiers` の `iap_product_id_ios` / `iap_product_id_android` を各行に設定。

## 6. ストア Webhook（自動更新通知）
- **Apple**: App Store Connect → App → App Store Server Notifications の Production/Sandbox URL に
  `…/functions/v1/community-renewal-webhook` を登録。
- **Google**: Play Console → 収益化 → リアルタイム デベロッパー通知 で Pub/Sub トピックを作成し、
  その push 先に同 URL を指定。

## 7. テスト（必須）
- IAP **サンドボックステスト**: Premium階層購入 / コミュニティ参加購入 / 自動更新（時間短縮）。
- 署名動画の再生（会員/非会員/未設定）。
- 収益台帳(community_earnings)に正しく 85/15 で記帳されるか。

## 8. 法務・運用
- ⚠️ **金商法**: 有料コミュニティでのFX売買助言は投資助言業登録の恐れ → 規約で個別シグナル
  有償提供を禁止し、**弁護士確認**。詳細は [[docs/community-monetization.md]]。
- 作成者ペイアウト運用（本人確認・振込・税務）の設計。

## 9. リリースチェックリスト（MVP）
- [ ] IAP サンドボックステスト通過（Premium階層）
- [ ] プッシュ通知の実機確認
- [ ] 無料動画の実ID投入
- [ ] App Store / Play 提出（メタデータ: docs/app-store-metadata.md）
- [ ] （フル機能なら）Cloudflare + Premium動画、コミュニティ課金 のテスト完了
