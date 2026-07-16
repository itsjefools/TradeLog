# EAS Build 手順書

## 1. 初回セットアップ（1回だけ）

```bash
# EAS CLI（既に node_modules にあれば不要）
npm install -g eas-cli

# Expo にログイン（itsjefools アカウント）
eas login

# プロジェクト初期化
eas init
```

`eas init` 実行後、`app.json` の `extra.eas.projectId` が自動設定されます。
`REPLACE_WITH_EAS_PROJECT_ID` を実際の ID に置換してください（コマンドが自動で書く場合も多い）。

---

## 2. Apple Developer アカウント承認後

### Apple App Store Connect 側

1. **App Store Connect** にログイン → My Apps → **+** → New App
2. 以下を入力:
   - Platforms: iOS
   - Name: TradeLog
   - Primary Language: Japanese
   - Bundle ID: `com.kingjay.tradelog`（事前に Apple Developer の Identifiers で登録）
   - SKU: `tradelog-ios-001`（任意）
3. 作成後、左メニュー「App Information」で `ascAppId`（数字 ID）を確認

### eas.json を更新

`eas.json` の `submit.production.ios` を更新:
- `ascAppId`: 上記で確認した ID
- `appleTeamId`: Apple Developer の Membership ページで確認

### App Store サブスクリプション商品

App Store Connect で iOS アプリ作成後:
1. Plus / Pro の月額・年額商品を自動更新サブスクリプションとして登録
2. 商品IDを `lib/iap.ts` の `PRODUCT_IDS` と一致させる
3. 有料App契約・税務・銀行口座の設定を完了する

---

## 3. ビルド種類

| プロファイル | 用途 | コマンド |
|---|---|---|
| **development** | 実機テスト用（Hermes デバッガ付き） | `eas build --profile development --platform ios` |
| **preview** | 登録端末への内部配布 | `eas build --profile preview --platform ios` |
| **production** | TestFlight / App Store 提出用 | `eas build --profile production --platform ios` |

Android も同様に `--platform android` で。

---

## 4. 開発ビルドの流れ（IAP/プッシュテスト用）

```bash
# 開発ビルド作成（10〜20分かかる）
eas build --profile development --platform ios

# 完了したら Expo dashboard / メールで .ipa 配布リンクが届く
# iPhone で Safari からリンクを開いて TestFlight 経由でインストール

# その後ローカル開発サーバを起動
npx expo start --dev-client
```

---

## 5. App Store 提出

```bash
# 本番ビルド作成
eas build --profile production --platform ios

# App Store Connect に自動アップロード
eas submit --profile production --platform ios
```

---

## 6. Android (Google Play)

ビルド: `eas build --profile production --platform android` で `.aab` が生成される。

Play Console に Service Account JSON を作成し `google-play-service-account.json` として配置すれば、`eas submit --platform android` で自動アップロード可能。

---

## チェックリスト

- [ ] `eas init` 実行済み（projectId 設定済み）
- [ ] Apple Developer Program 承認済み
- [ ] Bundle ID `com.kingjay.tradelog` 登録済み
- [ ] App Store Connect でアプリ作成済み
- [ ] In-App Purchase Key (.p8) 発行済み
- [ ] react-native-iap の4商品IDがストア登録内容と一致
- [ ] 購入・購入復元のSandboxテスト完了
- [ ] eas.json の `ascAppId` / `appleTeamId` 設定済み
- [ ] スプラッシュ画像・アイコン最終確認
- [ ] App Store Connect の商品（Subscription）登録済み
- [ ] スクリーンショット 5 枚 + アプリ説明文準備済み
- [ ] 利用規約・プライバシーポリシーの公開 URL 準備済み
