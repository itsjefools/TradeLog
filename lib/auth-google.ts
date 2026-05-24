import { supabase } from './supabase';

// Google Sign-In のネイティブモジュールは未設定/未バンドルでも起動時に落ちないよう
// static import せず遅延 require + try/catch で取得する。
type GoogleSigninType =
  typeof import('@react-native-google-signin/google-signin').GoogleSignin;
let _gsi: GoogleSigninType | null | undefined;
function getGoogleSignin(): GoogleSigninType | null {
  if (_gsi !== undefined) return _gsi;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _gsi = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    _gsi = null;
  }
  return _gsi ?? null;
}

/**
 * Google Client ID は EXPO_PUBLIC_GOOGLE_* 環境変数経由で読み込む。
 * 未設定の場合は Google ログインボタンを表示しない (isGoogleSignInConfigured で判定)。
 *
 * 設定手順:
 *   1. Google Cloud Console → APIs → Credentials で OAuth 2.0 Client ID を作成
 *      - iOS 用 Client ID
 *      - Web Client ID (Supabase の Google Provider にも同じものを設定する)
 *   2. .env.local または EAS Secret に追加:
 *      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
 *      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
 *   3. app.json の "@react-native-google-signin/google-signin" プラグインの
 *      iosUrlScheme を iOS Client ID の逆順形式 (com.googleusercontent.apps.xxx) に
 */
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

let configured = false;

export function isGoogleSignInConfigured(): boolean {
  return WEB_CLIENT_ID.length > 0;
}

export function configureGoogleSignIn(): void {
  if (configured) return;
  if (!isGoogleSignInConfigured()) return;
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) return;
  GoogleSignin.configure({
    iosClientId: IOS_CLIENT_ID || undefined,
    webClientId: WEB_CLIENT_ID,
  });
  configured = true;
}

export async function signInWithGoogle() {
  if (!isGoogleSignInConfigured()) {
    throw new Error('Google Sign-In is not configured');
  }
  if (!configured) configureGoogleSignIn();

  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available');
  }
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();

  const idToken = result.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token returned from Google');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  return data;
}
