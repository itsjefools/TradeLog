// 画像圧縮ユーティリティ。
// expo-image-manipulator はネイティブモジュール。古いビルド(未バンドル)でも
// 起動時に落ちないよう、static import せず遅延 require + try/catch で扱う。

type Manipulator = typeof import('expo-image-manipulator');

let cached: Manipulator | null | undefined;
function getManipulator(): Manipulator | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-image-manipulator') as Manipulator;
  } catch {
    cached = null;
  }
  return cached;
}

// 投稿画像の圧縮 (最大幅1200px, 品質70%)
export async function compressPostImage(uri: string): Promise<string> {
  const M = getManipulator();
  if (!M) return uri;
  try {
    const result = await M.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: M.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

// アバター画像の圧縮 (400x400, 品質80%)
export async function compressAvatarImage(uri: string): Promise<string> {
  const M = getManipulator();
  if (!M) return uri;
  try {
    const result = await M.manipulateAsync(
      uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.8, format: M.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}
