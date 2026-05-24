import * as ImagePicker from 'expo-image-picker';

import { compressAvatarImage, compressPostImage } from './image';
import { supabase } from './supabase';

/**
 * 写真ライブラリから画像を1枚ピックして Supabase Storage の指定バケットにアップロード。
 * 成功した場合は public URL を返す。キャンセル時 / 失敗時は null。
 */
export async function pickAndUploadImage(opts: {
  bucket: string;
  pathPrefix: string; // 例: `${userId}/trade-${tradeId}`
  aspect?: [number, number];
}): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('画像へのアクセス許可がありません');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!opts.aspect,
    aspect: opts.aspect,
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  // アップロード前に圧縮 (アバターは正方形400px、それ以外は幅1200px)。出力は JPEG。
  const uri = opts.aspect
    ? await compressAvatarImage(asset.uri)
    : await compressPostImage(asset.uri);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('ログインが必要です');

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const mime = 'image/jpeg';
  const fileName = `${opts.pathPrefix}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(opts.bucket)
    .upload(fileName, arrayBuffer, {
      contentType: mime,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(opts.bucket).getPublicUrl(fileName);

  return publicUrl;
}
