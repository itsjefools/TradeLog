import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export type MediaKind = 'image' | 'video';

export type LocalMedia = {
  uri: string;
  kind: MediaKind;
  width?: number;
  height?: number;
  duration?: number; // 動画の長さ (ミリ秒)
  mimeType?: string;
};

const VIDEO_MAX_DURATION_SEC = 60;

/**
 * 写真ライブラリから複数の画像を選択（カメラロールピッカー）
 */
export async function pickImagesFromLibrary(
  remainingSlots: number,
): Promise<LocalMedia[]> {
  if (remainingSlots <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('写真ライブラリへのアクセス許可がありません');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: Math.min(remainingSlots, 4),
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    kind: 'image' as const,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? 'image/jpeg',
  }));
}

/**
 * カメラから1枚撮影
 */
export async function takePhotoWithCamera(): Promise<LocalMedia | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('カメラへのアクセス許可がありません');
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    kind: 'image',
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? 'image/jpeg',
  };
}

/**
 * 動画を1本選択（最大60秒）
 */
export async function pickVideoFromLibrary(): Promise<LocalMedia | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('写真ライブラリへのアクセス許可がありません');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: VIDEO_MAX_DURATION_SEC,
    quality: 0.7,
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  if (
    typeof a.duration === 'number' &&
    a.duration > VIDEO_MAX_DURATION_SEC * 1000
  ) {
    throw new Error(`動画は ${VIDEO_MAX_DURATION_SEC} 秒以内にしてください`);
  }
  return {
    uri: a.uri,
    kind: 'video',
    width: a.width,
    height: a.height,
    duration: a.duration ?? undefined,
    mimeType: a.mimeType ?? 'video/mp4',
  };
}

/**
 * 1つの LocalMedia を Supabase Storage `post-images` にアップロード。
 * 成功すると public URL を返す。
 */
async function uploadOne(
  media: LocalMedia,
  userId: string,
  index: number,
): Promise<string> {
  const response = await fetch(media.uri);
  const arrayBuffer = await response.arrayBuffer();

  const mime = media.mimeType ?? (media.kind === 'video' ? 'video/mp4' : 'image/jpeg');
  const extFromMime = mime.split('/')[1] ?? (media.kind === 'video' ? 'mp4' : 'jpg');
  const ext = extFromMime.replace('jpeg', 'jpg').replace('quicktime', 'mov');
  const fileName = `${userId}/${Date.now()}_${index}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(fileName, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from('post-images').getPublicUrl(fileName);
  return publicUrl;
}

/**
 * 複数 LocalMedia を順次アップロードし、URL の配列を返す。
 */
export async function uploadPostMedia(
  list: LocalMedia[],
): Promise<string[]> {
  if (list.length === 0) return [];
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('ログインが必要です');

  const urls: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const url = await uploadOne(list[i], userId, i);
    urls.push(url);
  }
  return urls;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
