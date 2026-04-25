# TradeLog — プロジェクト概要

## アプリのビジョン
TradeLogは「FXトレーダーのためのSNS × 取引記録プラットフォーム」。
FX取引の記録・分析ツールとトレーダー同士のソーシャルネットワークを融合した総合アプリ。

## 3つの柱
1. **取引記録** — 通貨ペア、エントリー/エグジット、P&L、メモを記録。カレンダー・KPI・チャートで可視化
2. **ソーシャル共有** — 取引結果・月間成績・手法をSNS形式で投稿。いいね・コメント・フォロー機能
3. **コミュニティ** — 手法の共有、ランキング、ハッシュタグ検索で学び合いの場

## 技術スタック
- **フロントエンド**: React Native (Expo)
- **バックエンド**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **認証**: Supabase Auth (Email / Google / Apple SSO)
- **プッシュ通知**: Expo Notifications
- **CI/CD**: EAS Build (Expo)
- **言語**: TypeScript

## データベース設計（Supabase / PostgreSQL）

### users テーブル
- id (UUID, PK)
- email
- username (ユニーク, @表示名)
- display_name
- avatar_url
- bio (自己紹介)
- trade_style (スキャルピング/デイトレード/スイングなど)
- language (ja/en/pt/zh/es)
- is_premium (boolean)
- created_at

### trades テーブル
- id (UUID, PK)
- user_id (FK → users)
- currency_pair (USD/JPY, EUR/USD など)
- direction (long / short)
- entry_price
- exit_price
- lot_size
- pnl (損益額)
- pnl_pips (pips)
- memo (トレードの根拠メモ)
- traded_at (取引日時)
- is_shared (boolean, フィードに共有するか)
- created_at

### posts テーブル
- id (UUID, PK)
- user_id (FK → users)
- trade_id (FK → trades, nullable, 取引結果投稿の場合)
- post_type (trade_result / strategy / text)
- content (テキスト本文)
- image_urls (配列, 手法画像など)
- hashtags (配列)
- likes_count
- comments_count
- created_at

### follows テーブル
- follower_id (FK → users)
- following_id (FK → users)
- created_at
- PK: (follower_id, following_id)

### likes テーブル
- user_id (FK → users)
- post_id (FK → posts)
- created_at
- PK: (user_id, post_id)

### comments テーブル
- id (UUID, PK)
- user_id (FK → users)
- post_id (FK → posts)
- content
- created_at

### notifications テーブル
- id (UUID, PK)
- user_id (FK → users, 通知を受ける人)
- actor_id (FK → users, アクションした人)
- type (like / comment / follow / mention)
- post_id (FK → posts, nullable)
- is_read (boolean)
- created_at

## 画面構成
1. **フィード (タイムライン)** — フォロー中のトレーダーの投稿一覧
2. **取引記録** — 取引入力フォーム + カレンダービュー
3. **分析ダッシュボード** — 月間P&L、勝率、RR比、通貨ペア別成績
4. **プロフィール** — ユーザー情報、成績サマリー、取引履歴
5. **検索・ランキング** — ハッシュタグ検索、月間ランキング

## ナビゲーション
ボトムタブ: フィード / 記録 / 分析 / プロフィール

## ビジネスモデル
フリーミアム (Free + Premium $4.99〜$9.99/月)
- Free: 月30件記録、月5投稿、基本統計、広告あり
- Premium: 無制限記録・投稿、高度分析、エクスポート、広告なし、バッジ

## ターゲット
グローバルのFXトレーダー（まず日本市場から開始）

## 多言語対応
日本語・英語・ポルトガル語・中国語・スペイン語

## 開発者
- 名前: Jeff Rodrigues
- GitHub: itsjefools/TradeLog
- メール: trilionbrothers@gmail.com

## 開発方針
- 個人開発のため、シンプルで保守しやすいコードを優先
- Claudeを活用して開発効率を最大化
- Supabase RLS（行レベルセキュリティ）で堅牢なアクセス制御
- モバイルファースト、ダークテーマベースのUI
- アクセントカラー: インディゴ(#6366F1) + グリーン(#10B981)