import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { COUNTRIES, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { TRADE_STYLE_OPTIONS, TradeStyle } from '@/lib/types';

export default function ProfileEditScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profile, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [tradeStyle, setTradeStyle] = useState<string | null>(
    profile?.trade_style ?? null,
  );
  const [nationality, setNationality] = useState<string | null>(
    profile?.nationality ?? null,
  );
  const [countrySearch, setCountrySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fallbackName =
    displayName.trim() || username.trim() || profile?.email?.split('@')[0] || 'U';

  const pickAvatar = async () => {
    if (avatarUploading || saving) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要', '画像を選ぶには写真へのアクセス許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const uri = asset.uri;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('ログインが必要です');

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const mime = asset.mimeType ?? 'image/jpeg';
      const ext = (mime.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
      const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: mime,
          upsert: true,
        });
      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('画像のアップロード失敗', msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (avatarUploading || saving) return;
    if (!profile?.avatar_url) return;
    Alert.alert('プロフィール画像を削除', '画像を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateProfile({ avatar_url: null });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert('削除失敗', msg);
          }
        },
      },
    ]);
  };

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (q === '') return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  const handleSave = async () => {
    if (username.trim() && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      Alert.alert(
        '入力エラー',
        'ユーザー名は半角英数字とアンダースコア (_) のみ使えます。',
      );
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        trade_style: tradeStyle,
        nationality: nationality?.toUpperCase() ?? null,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('保存失敗', msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleTradeStyle = (value: TradeStyle) => {
    setTradeStyle((prev) => (prev === value ? null : value));
  };

  const selectCountry = (code: string) => {
    setNationality(code);
    setCountrySearch('');
  };

  const selectedCountry =
    nationality && COUNTRIES.find((c) => c.code === nationality.toUpperCase());

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={saving}>
          <Text style={styles.headerLink}>キャンセル</Text>
        </Pressable>
        <Text style={styles.headerTitle}>プロフィール編集</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Text style={[styles.headerLink, styles.saveLink]}>保存</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <Pressable
              onPress={pickAvatar}
              onLongPress={removeAvatar}
              disabled={avatarUploading || saving}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && styles.avatarPressed,
              ]}
            >
              <Avatar
                uri={profile?.avatar_url}
                displayName={fallbackName}
                size={96}
              />
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </Pressable>
            <Text style={styles.avatarHint}>
              {avatarUploading
                ? 'アップロード中...'
                : profile?.avatar_url
                  ? 'タップで変更 / 長押しで削除'
                  : 'タップして画像を選択'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>表示名</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="例: ジェフ"
              placeholderTextColor={c.textSecondary}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>ユーザー名 (@)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="例: jeff_trader"
              placeholderTextColor={c.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.helper}>半角英数字と _ のみ</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>自己紹介</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="トレード歴・得意な手法など"
              placeholderTextColor={c.textSecondary}
              multiline
              numberOfLines={4}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>トレードスタイル</Text>
            <View style={styles.chipsRow}>
              {TRADE_STYLE_OPTIONS.map((opt) => {
                const selected = tradeStyle === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleTradeStyle(opt.value)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>国籍</Text>
            {selectedCountry && (
              <View style={styles.selectedCountryBox}>
                <Text style={styles.selectedFlag}>
                  {flagEmoji(selectedCountry.code)}
                </Text>
                <Text style={styles.selectedCountryName}>
                  {selectedCountry.name}
                </Text>
                <Pressable
                  onPress={() => setNationality(null)}
                  hitSlop={6}
                  style={styles.clearCountry}
                >
                  <Text style={styles.clearCountryText}>×</Text>
                </Pressable>
              </View>
            )}
            <TextInput
              style={[styles.input, styles.inputMt]}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="検索（例: Japan, JP, 日本）"
              placeholderTextColor={c.textSecondary}
              autoCorrect={false}
              editable={!saving}
            />
            {countrySearch.trim() !== '' && (
              <View style={[styles.chipsRow, styles.chipsRowMt]}>
                {filteredCountries.length === 0 ? (
                  <Text style={styles.noMatchText}>
                    該当する国がありません
                  </Text>
                ) : (
                  filteredCountries.slice(0, 30).map((c) => {
                    const selected =
                      nationality?.toUpperCase() === c.code;
                    return (
                      <Pressable
                        key={c.code}
                        style={[
                          styles.countryChip,
                          selected && styles.chipSelected,
                        ]}
                        onPress={() => selectCountry(c.code)}
                        disabled={saving}
                      >
                        <Text style={styles.countryChipFlag}>
                          {flagEmoji(c.code)}
                        </Text>
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </View>

          {profile?.is_verified && (
            <View style={styles.verifiedNotice}>
              <Text style={styles.verifiedNoticeText}>
                ✓ 本人確認済みアカウント
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  headerLink: {
    fontSize: 15,
    color: c.textSecondary,
  },
  saveLink: {
    color: c.accent,
    fontWeight: '700',
  },
  body: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.85,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 12,
    color: c.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: 8,
  },
  helper: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.textPrimary,
  },
  inputMt: {
    marginTop: 8,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsRowMt: {
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  countryChipFlag: {
    fontSize: 16,
  },
  selectedCountryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.accent,
  },
  selectedFlag: {
    fontSize: 22,
  },
  selectedCountryName: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '600',
  },
  clearCountry: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearCountryText: {
    fontSize: 16,
    color: c.textSecondary,
  },
  noMatchText: {
    fontSize: 13,
    color: c.textSecondary,
    paddingVertical: 8,
  },
  verifiedNotice: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
  },
  verifiedNoticeText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  });
}
