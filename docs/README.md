# TradeLog Legal Docs (GitHub Pages)

App Store / Google Play 申請に必要な、利用規約とプライバシーポリシーの公開用 HTML。

## ホスティング手順 (GitHub Pages)

1. このリポジトリは既に GitHub にあるので、設定するだけ:
2. **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / Folder: `/docs`
   - Save
3. 数分後、以下の URL で公開される:
   - トップ: `https://itsjefools.github.io/TradeLog/`
   - 利用規約: `https://itsjefools.github.io/TradeLog/terms.html`
   - プライバシー: `https://itsjefools.github.io/TradeLog/privacy.html`

## App Store / Google Play 申請時に使う

- **App Store Connect**:
  - **App Privacy** セクション → Privacy Policy URL: 上記 privacy.html の URL
  - **App Information** → License Agreement: terms.html の URL を貼るか、デフォルト EULA を使う
- **Google Play Console**:
  - **Policy → App content → Privacy policy** に privacy.html の URL を入力

## 更新時

`lib/legal-text.ts`（アプリ内）と `docs/*.html`（Web）の **両方を同時に更新**してください。整合性を保つため。
