import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { AnalyticsEvents } from '@/lib/analytics';
import { notifyError, notifySuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import {
  LocalMedia,
  pickMediaFromLibrary,
  takePhotoWithCamera,
  uploadPostMedia,
} from '@/lib/upload-media';

const MAX_CHARS = 1000;
const MAX_MEDIA = 4;

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([A-Za-z0-9_぀-ゟ゠-ヿ一-鿿]+)/g) ?? [];
  const tags = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(tags));
}

export default function CreatePostScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const { profile } = useProfile();
  const myId = session?.user.id ?? null;

  const [text, setText] = useState('');
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  // トレンドタグを取得（# 入力時の候補に使う）。
  useEffect(() => {
    supabase
      .rpc('get_trending_hashtags', { days: 30, top_n: 30 })
      .then(({ data, error }) => {
        if (!error && data) {
          setTrendingTags((data as { tag: string }[]).map((d) => d.tag));
        }
      });
  }, []);

  // テキスト末尾が「#...」なら、その部分入力に一致するトレンドタグを候補表示。
  const hashtagPartial = useMemo(() => {
    const m = text.match(/#([A-Za-z0-9_぀-ゟ゠-ヿ一-鿿]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [text]);
  const tagSuggestions = useMemo(() => {
    if (hashtagPartial === null) return [];
    return trendingTags
      .filter((tg) => tg.startsWith(hashtagPartial) && tg !== hashtagPartial)
      .slice(0, 6);
  }, [hashtagPartial, trendingTags]);

  const applyHashtag = (tag: string) => {
    setText((prev) => {
      const m = prev.match(/#([A-Za-z0-9_぀-ゟ゠-ヿ一-鿿]*)$/);
      const base = m ? prev.slice(0, prev.length - m[0].length) : prev;
      return `${base}#${tag} `.slice(0, MAX_CHARS);
    });
  };

  // 投稿は全プラン無制限
  const trimmed = text.trim();
  const canSubmit =
    !submitting && (trimmed.length > 0 || media.length > 0);

  const fallbackName = profile?.email?.split('@')[0] ?? t('profile.defaultName');
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;

  const remainingSlots = MAX_MEDIA - media.length;

  const translateMediaError = (msg: string): string => {
    switch (msg) {
      case 'video_too_large':
        return t('post.video_too_large');
      case 'image_too_large':
        return t('post.image_too_large');
      case 'video_too_long':
        return t('post.video_too_long');
      case 'media_permission_denied':
        return t('post.media_permission_denied');
      case 'camera_permission_denied':
        return t('post.camera_permission_denied');
      case 'not_authenticated':
        return t('post.not_authenticated');
      default:
        return msg;
    }
  };

  const handlePickMedia = async () => {
    if (remainingSlots <= 0) return;
    try {
      const picked = await pickMediaFromLibrary(remainingSlots);
      if (picked.length > 0) {
        setMedia((prev) => [...prev, ...picked].slice(0, MAX_MEDIA));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), translateMediaError(msg));
    }
  };

  const handleCamera = async () => {
    if (remainingSlots <= 0) return;
    try {
      const photo = await takePhotoWithCamera();
      if (photo) setMedia((prev) => [...prev, photo].slice(0, MAX_MEDIA));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), translateMediaError(msg));
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const insertChar = (char: string) => {
    setText((t) => (t.endsWith(' ') || t === '' ? t + char : t + ' ' + char));
  };

  const handleSubmit = async () => {
    if (!myId) return;
    setSubmitting(true);
    try {
      const { imageUrls, videoUrls } = await uploadPostMedia(media);
      const hashtags = extractHashtags(text);

      const { error } = await supabase.from('posts').insert({
        user_id: myId,
        trade_id: null,
        post_type: 'text',
        content: trimmed || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        hashtags,
        likes_count: 0,
        comments_count: 0,
      });
      if (error) throw new Error(error.message);

      AnalyticsEvents.postCreated(imageUrls.length > 0, videoUrls.length > 0);
      notifySuccess();
      toast.success(t('createPost.postSuccess'));
      router.back();
    } catch (e) {
      notifyError();
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('createPost.postFail'), translateMediaError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const charLeft = MAX_CHARS - text.length;
  const charLow = charLeft <= 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          disabled={submitting}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('createPost.title')}</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={12}
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
            pressed && canSubmit && styles.submitButtonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{t('createPost.submit')}</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.userRow}>
            <Avatar
              uri={profile?.avatar_url}
              displayName={displayName}
              size={36}
            />
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
            placeholder={t('createPost.placeholder')}
            placeholderTextColor={c.textSecondary}
            multiline
            autoFocus
            editable={!submitting}
            maxLength={MAX_CHARS}
          />

          <View style={styles.counterRow}>
            <Text
              style={[
                styles.counter,
                charLow && styles.counterLow,
              ]}
            >
              {text.length}/{MAX_CHARS}
            </Text>
          </View>

          {media.length > 0 && (
            <View style={styles.mediaGrid}>
              {media.map((m, i) => (
                <View key={`${m.uri}-${i}`} style={styles.mediaThumb}>
                  <Image
                    source={{ uri: m.uri }}
                    style={styles.mediaImage}
                    contentFit="cover"
                  />
                  {m.kind === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  )}
                  <Pressable
                    onPress={() => removeMedia(i)}
                    style={styles.removeButton}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {tagSuggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestRow}
            style={styles.suggestWrap}
          >
            {tagSuggestions.map((tg) => (
              <Pressable
                key={tg}
                onPress={() => applyHashtag(tg)}
                style={styles.suggestChip}
              >
                <Text style={styles.suggestChipText}>#{tg}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.toolbar}>
          <ToolButton
            icon="camera-outline"
            disabled={submitting || remainingSlots <= 0}
            onPress={handleCamera}
            c={c}
          />
          <ToolButton
            icon="image-outline"
            disabled={submitting || remainingSlots <= 0}
            onPress={handlePickMedia}
            c={c}
          />
          <View style={styles.toolDivider} />
          <ToolButton
            label="#"
            disabled={submitting}
            onPress={() => insertChar('#')}
            c={c}
          />
          <ToolButton
            label="@"
            disabled={submitting}
            onPress={() => insertChar('@')}
            c={c}
          />
          <View style={styles.flex} />
          {remainingSlots < MAX_MEDIA && (
            <Text style={styles.mediaCount}>
              {media.length}/{MAX_MEDIA}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToolButton({
  icon,
  label,
  disabled,
  onPress,
  c,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label?: string;
  disabled?: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        toolButtonStyles.btn,
        pressed && !disabled && toolButtonStyles.pressed,
        disabled && toolButtonStyles.disabled,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={c.textPrimary} />
      ) : (
        <Text style={[toolButtonStyles.label, { color: c.textPrimary }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const toolButtonStyles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.3 },
  label: { fontSize: 18, fontWeight: '700' },
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    submitButton: {
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      minWidth: 78,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.4,
    },
    submitButtonPressed: {
      opacity: 0.85,
    },
    submitButtonText: {
      fontSize: 13,
      color: '#fff',
      fontWeight: '700',
    },
    body: {
      padding: 16,
      paddingBottom: 24,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    userName: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
    },
    input: {
      fontSize: 17,
      color: c.textPrimary,
      lineHeight: 24,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    counterRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 6,
    },
    counter: {
      fontSize: 12,
      color: c.textSecondary,
    },
    counterLow: {
      color: c.danger,
      fontWeight: '700',
    },
    mediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    mediaThumb: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: c.surfaceAlt,
      position: 'relative',
    },
    mediaImage: {
      width: '100%',
      height: '100%',
    },
    videoBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestWrap: {
      maxHeight: 44,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    suggestRow: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    suggestChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surfaceAlt,
    },
    suggestChipText: { fontSize: 13, fontWeight: '600', color: c.accent },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
    toolDivider: {
      width: StyleSheet.hairlineWidth,
      height: 24,
      backgroundColor: c.border,
      marginHorizontal: 4,
    },
    mediaCount: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      marginRight: 4,
    },
  });
}
