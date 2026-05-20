import * as FileSystem from 'expo-file-system';
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

export type UploadedMedia = {
  url: string;
  kind: MediaKind;
};

const VIDEO_MAX_DURATION_SEC = 60;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

const POST_IMAGE_BUCKET = 'post-images';
const POST_VIDEO_BUCKET = 'videos';

/**
 * 画像と動画を混在で選択（最大 remainingSlots 個まで、動画は最長60秒）
 */
export async function pickMediaFromLibrary(
  remainingSlots: number,
): Promise<LocalMedia[]> {
  if (remainingSlots <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('media_permission_denied');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: Math.min(remainingSlots, 4),
    quality: 0.8,
    videoMaxDuration: VIDEO_MAX_DURATION_SEC,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => {
    const kind: MediaKind = a.type === 'video' ? 'video' : 'image';
    return {
      uri: a.uri,
      kind,
      width: a.width,
      height: a.height,
      duration: a.duration ?? undefined,
      mimeType: a.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    };
  });
}

/**
 * 画像のみ選択（互換のため残す）
 */
export async function pickImagesFromLibrary(
  remainingSlots: number,
): Promise<LocalMedia[]> {
  if (remainingSlots <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('media_permission_denied');
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
    throw new Error('camera_permission_denied');
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
    throw new Error('media_permission_denied');
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
    throw new Error('video_too_long');
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

async function getFileSize(uri: string): Promise<number | undefined> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return undefined;
    return info.size;
  } catch {
    return undefined;
  }
}

async function uploadOne(
  media: LocalMedia,
  userId: string,
  index: number,
): Promise<UploadedMedia> {
  const size = await getFileSize(media.uri);
  if (media.kind === 'video' && size !== undefined && size > VIDEO_MAX_BYTES) {
    throw new Error('video_too_large');
  }
  if (media.kind === 'image' && size !== undefined && size > IMAGE_MAX_BYTES) {
    throw new Error('image_too_large');
  }

  const response = await fetch(media.uri);
  const arrayBuffer = await response.arrayBuffer();

  const mime =
    media.mimeType ?? (media.kind === 'video' ? 'video/mp4' : 'image/jpeg');
  const extFromMime = mime.split('/')[1] ?? (media.kind === 'video' ? 'mp4' : 'jpg');
  const ext = extFromMime.replace('jpeg', 'jpg').replace('quicktime', 'mov');
  const bucket = media.kind === 'video' ? POST_VIDEO_BUCKET : POST_IMAGE_BUCKET;
  const fileName = `${userId}/${Date.now()}_${index}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, {
      contentType: mime,
      upsert: false,
      cacheControl: '3600',
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return { url: publicUrl, kind: media.kind };
}

/**
 * 複数 LocalMedia を順次アップロードし、画像URLと動画URLに分けて返す。
 */
export async function uploadPostMedia(
  list: LocalMedia[],
): Promise<{ imageUrls: string[]; videoUrls: string[] }> {
  if (list.length === 0) return { imageUrls: [], videoUrls: [] };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const imageUrls: string[] = [];
  const videoUrls: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const result = await uploadOne(list[i], userId, i);
    if (result.kind === 'video') videoUrls.push(result.url);
    else imageUrls.push(result.url);
  }
  return { imageUrls, videoUrls };
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
