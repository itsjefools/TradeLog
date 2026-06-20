// Expo config plugin: GoogleUtilities / RecaptchaInterop にモジュールヘッダーを付与する。
//
// なぜ必要か:
//   @react-native-google-signin が依存する Swift pod `AppCheckCore` は
//   `GoogleUtilities` と `RecaptchaInterop` を import するが、これらは module を
//   定義しないため、静的ライブラリとしての統合時に CocoaPods が次のエラーで失敗する:
//     "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and `RecaptchaInterop`,
//      which do not define modules."
//   該当 pod を `:modular_headers => true` で明示宣言すると module map が生成され解決する。
//
// ios/ は prebuild で毎回再生成されるため、Podfile を直接編集せずこのプラグインで注入する。

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// AppCheckCore 自体は Swift（既に module）。module 未定義の 2 つだけ対象にする。
const MODULAR_PODS = ['GoogleUtilities', 'RecaptchaInterop'];

const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const lines = MODULAR_PODS
        // 既に宣言済み（再実行・将来の変更）ならスキップして冪等にする
        .filter((name) => !new RegExp(`pod\\s+['"]${name}['"]`).test(contents))
        .map((name) => `  pod '${name}', :modular_headers => true`);

      if (lines.length > 0) {
        // `use_expo_modules!` の直後に挿入する
        const marker = /(\n[ \t]*use_expo_modules!.*\n)/;
        if (!marker.test(contents)) {
          throw new Error(
            '[withModularHeaders] Podfile に use_expo_modules! が見つからず、挿入位置を特定できませんでした。'
          );
        }
        contents = contents.replace(marker, `$1${lines.join('\n')}\n`);
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);
};

module.exports = withModularHeaders;
