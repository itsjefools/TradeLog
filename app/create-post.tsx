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
import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { FREE_LIMITS, getPlan } from '@/lib/premium';
import { supabase } from '@/lib/supabase';
import {
  LocalMedia,
  pickImagesFromLibrary,
  pickVideoFromLibrary,
  takePhotoWithCamera,
  uploadPostMedia,
} from '@/lib/upload-media';

const ACCENT = '#10B981';
const MAX_CHARS = 1000;
const MAX_MEDIA = 4;

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([A-Za-z0-9_぀-ゟ゠-ヿ一-鿿]+)/g) ?? [];
  const tags = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(tags));
}

export default function CreatePostScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const myId = session?.user.id ?? null;

  const [text, setText] = useState('');
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);

  const plan = getPlan(profile?.is_premium);
  const isPremium = plan === 'premium';
  const overLimit =
    !isPremium &&
    monthlyCount !== null &&
    monthlyCount >= FREE_LIMITS.monthlyPosts;

  const trimmed = text.trim();
  const canSubmit =
    !submitting && (trimmed.length > 0 || media.length > 0) && !overLimit;

  useEffect(() => {
    if (!myId) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', myId)
      .gte('created_at', monthStart.toISOString())
      .then(({ count }) => setMonthlyCount(count ?? 0));
  }, [myId]);

  const fallbackName = profile?.email?.split('@')[0] ?? 'ユーザー';
  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;

  const remainingSlots = MAX_MEDIA - media.length;

  const handlePickImages = async () => {
    if (remainingSlots <= 0) return;
    try {
      const picked = await pickImagesFromLibrary(remainingSlots);
      if (picked.length > 0) {
        setMedia((prev) => [...prev, ...picked].slice(0, MAX_MEDIA));
      }
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const handleCamera = async () => {
    if (remainingSlots <= 0) return;
    try {
      const photo = await takePhotoWithCamera();
      if (photo) setMedia((prev) => [...prev, photo].slice(0, MAX_MEDIA));
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    }
  };

  const handlePickVideo = async () => {
    if (remainingSlots <= 0) return;
    try {
      const video = await pickVideoFromLibrary();
      if (video) setMedia((prev) => [...prev, video].slice(0, MAX_MEDIA));
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
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
    if (overLimit) {
      Alert.alert(
        'Free プランの上限',
        `Free プランでは月 ${FREE_LIMITS.monthlyPosts} 件まで投稿できます。Premium で無制限になります。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'Premium を見る',
            onPress: () => router.push('/premium'),
          },
        ],
      );
      return;
    }
    setSubmitting(true);
    try {
      const imageUrls = await uploadPostMedia(media);
      const hashtags = extractHashtags(text);

      const { error } = await supabase.from('posts').insert({
        user_id: myId,
        trade_id: null,
        post_type: 'text',
        content: trimmed || null,
        image_urls: imageUrls,
        hashtags,
        likes_count: 0,
        comments_count: 0,
      });
      if (error) throw new Error(error.message);

      router.back();
    } catch (e) {
      Alert.alert('投稿失敗', e instanceof Error ? e.message : String(e));
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
        <Text style={styles.headerTitle}>新規投稿</Text>
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
            <Text style={styles.submitButtonText}>投稿する</Text>
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
            placeholder="今何を考えていますか？"
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

          {overLimit && (
            <View style={styles.warningBox}>
              <Ionicons name="lock-closed" size={16} color={c.danger} />
              <Text style={styles.warningText}>
                今月の投稿上限（{FREE_LIMITS.monthlyPosts}件）に達しました。Premium で無制限になります。
              </Text>
            </View>
          )}
        </ScrollView>

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
            onPress={handlePickImages}
            c={c}
          />
          <ToolButton
            icon="videocam-outline"
            disabled={submitting || remainingSlots <= 0}
            onPress={handlePickVideo}
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
      backgroundColor: ACCENT,
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
      borderRadius: 10,
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
      borderRadius: 11,
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
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningBox: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.danger,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
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
