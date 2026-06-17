# 有料コミュニティ収益化 設計書（マーケットプレイス型）

作成: 2026-06-17 / ステータス: **設計合意済み・未実装**

「コミュニティ作成者が稼げて、TradeLog も手数料を取る」レベニューシェア型の有料コミュニティ。

## 確定した意思決定

| 項目 | 決定 |
|---|---|
| 決済方式 | **Apple / Google IAP**（アプリ内課金・自動更新サブスク） |
| 分配率 | **作成者 85% / TradeLog 15%**（Apple/Google 控除後の純額ベース） |
| プラットフォーム手数料 | Apple/Google 15%（Small Business Program 該当時。100万ドル超で30%） |

### お金の流れ（¥980/月・Small Business 15% の例）
```
メンバー ¥980
 → Apple/Google 15%  = ¥147
 → 純額              = ¥833
   ├ 作成者 85%       = ¥708
   └ TradeLog 15%     = ¥125
```
実質取り分: 作成者 約72% / TradeLog 約13% / Apple・Google 15%。

## IAP特有の制約（設計の前提）

1. **Apple/Google は作成者に自動送金しない。** 売上は全額 TradeLog の開発者アカウントに入金される
   → TradeLog が merchant of record。**作成者への支払いは TradeLog が自前で行う**（収益台帳＋月次ペイアウト）。
2. **価格は固定ティアからのみ。** 作成者が任意金額を設定できない
   → 価格ティアを用意し、作成者はそこから選ぶ。
3. **手数料は 15%（Small Business）/ 30%（超過時）** で変動しうる。

### 価格ティア（案・要確定）
¥480 / ¥980 / ¥1,980 / ¥2,980 / 月。各ティアを IAP 自動更新サブスク商品として登録。

## 規制リスク（要・専門家確認）

- 有料で **FX の売買助言・シグナルを提供すると「投資助言・代理業（金商法）」の登録**が必要になる恐れ。
  運営（TradeLog）にも法的リスクが及び得る。
- 対策方針: コミュニティを**「教育・交流」に限定**、規約で**個別売買シグナルの有償提供を禁止**、
  誇大表現（「必ず勝てる」等）禁止。**弁護士確認を必須とする。**

## 実装フェーズ（未着手）

1. **スキーマ**: `communities` に `price_tier`（or null=無料）、`creator_id`、収益関連列。
   `community_earnings`（台帳: community_id, creator_id, period, gross, platform_fee, store_fee, net_to_creator, status）。
   `creator_payout_accounts`（作成者の本人確認・振込先）。
2. **IAP サブスク商品**を価格ティアごとに作成（App Store Connect / Play Console）＋ `lib/iap.ts` 拡張。
3. **購入検証 Edge Function**: App Store Server Notifications / Play RTDN を受け、`community_members` を解放、
   `community_earnings` に分配を記録。
4. **作成者オンボーディング**（本人確認・振込先登録）＋ **収益ダッシュボード**画面。
5. **月次ペイアウト処理**（銀行振込 / Wise / Stripe Payouts のいずれか・要選定）＋ 最低支払額・税務（消費税/源泉）。

## 既存資産との関係

- `communities` / `community_members` テーブルは既存（[[components/school/school-community.tsx]]）。
- 有料コミュニティ作成条件は既存: 本人確認済み・Premium 会員・取引10件以上（`community.paid_req_*`）。
- 現状の `monthly_price` は表示のみ。本設計で「価格ティア＋IAP商品ID」に置き換える。

## 保留・次に決めること
- 価格ティアの最終確定。
- ペイアウト手段（銀行振込 / Wise / Stripe Payouts）と頻度・最低額。
- 規制対応の規約文言（弁護士確認）。
