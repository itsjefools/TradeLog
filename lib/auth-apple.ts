import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * iOS で「Sign in with Apple」を実行し、Supabase Auth にトークンを送って
 * セッションを確立する。
 * 初回サインアップ時に Apple から名前が返ってくれば profiles.display_name に保存する。
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  // Supabase の signInWithIdToken が要求する nonce を生成
  const rawNonce = Array.from(Crypto.getRandomBytes(32))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple は初回サインアップ時にしか名前を返さない仕様
  const userId = data.user?.id;
  if (userId && credential.fullName?.givenName) {
    const displayName = [
      credential.fullName.givenName,
      credential.fullName.familyName,
    ]
      .filter(Boolean)
      .join(' ');
    if (displayName) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', userId);
    }
  }

  return data;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
