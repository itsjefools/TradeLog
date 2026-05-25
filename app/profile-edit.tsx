import { Ionicons } from '@expo/vector-icons';
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
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { COUNTRIES, flagEmoji } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { TRADE_STYLE_OPTIONS, TradeStyle } from '@/lib/types';

function tradeStyleI18nKey(value: TradeStyle): string {
  switch (value) {
    case 'scalping':
      return 'auth.styleScalping';
    case 'day_trading':
      return 'auth.styleDayTrading';
    case 'swing':
      return 'auth.styleSwing';
    case 'position':
      return 'auth.stylePosition';
  }
}

export default function ProfileEditScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profile, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [youtube, setYoutube] = useState(profile?.youtube ?? '');
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
      Alert.alert(t('profileEdit.permissionTitle'), t('profileEdit.permissionBody'));
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
      if (!userId) throw new Error(t('profileEdit.notLoggedIn'));

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
      Alert.alert(t('profileEdit.uploadFail'), msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (avatarUploading || saving) return;
    if (!profile?.avatar_url) return;
    Alert.alert(t('profileEdit.confirmDeletePhotoTitle'), t('profileEdit.confirmDeletePhotoBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await updateProfile({ avatar_url: null });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert(t('profileEdit.deleteFail'), msg);
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
        t('profileEdit.inputErrorTitle'),
        t('profileEdit.inputErrorUsername'),
      );
      return;
    }
    const trimmedWebsite = website.trim();
    if (
      trimmedWebsite !== '' &&
      !/^https?:\/\/[^\s]+$/i.test(trimmedWebsite)
    ) {
      Alert.alert(
        t('profileEdit.inputErrorTitle'),
        t('profileEdit.inputErrorWebsite'),
      );
      return;
    }
    const trimmedYoutube = youtube.trim();
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        trade_style: tradeStyle,
        nationality: nationality?.toUpperCase() ?? null,
        website: trimmedWebsite || null,
        youtube: trimmedYoutube || null,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('profileEdit.saveFail'), msg);
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
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('profileEdit.title')}</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Text style={[styles.headerLink, styles.saveLink]}>{t('profileEdit.save')}</Text>
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
          bounces={false}
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
                ? t('profileEdit.photoUploading')
                : profile?.avatar_url
                  ? t('profileEdit.photoHintWithImage')
                  : t('profileEdit.photoHintEmpty')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.displayNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profileEdit.displayNameExample')}
              placeholderTextColor={c.textSecondary}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.usernameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('profileEdit.usernameExample')}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
            <Text style={styles.helper}>{t('profileEdit.usernameHelper')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.bioLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('profileEdit.bioPlaceholder')}
              placeholderTextColor={c.textSecondary}
              multiline
              numberOfLines={4}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.websiteLabel')}</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder={t('profileEdit.websitePlaceholder')}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving}
            />
            <Text style={styles.helper}>{t('profileEdit.websiteHelper')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.youtubeLabel')}</Text>
            <TextInput
              style={styles.input}
              value={youtube}
              onChangeText={setYoutube}
              placeholder={t('profileEdit.youtubePlaceholder')}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving}
            />
            <Text style={styles.helper}>{t('profileEdit.youtubeHelper')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('badges.manageTitle')}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.navRow,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.push('/badges')}
              disabled={saving}
            >
              <Ionicons name="ribbon-outline" size={18} color={c.accent} />
              <Text style={styles.navRowText}>{t('badges.editShowcase')}</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.tradeStyleLabel')}</Text>
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
                      {t(tradeStyleI18nKey(opt.value))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profileEdit.nationalityLabel')}</Text>
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
              placeholder={t('profileEdit.nationalitySearchPlaceholder')}
              placeholderTextColor={c.textSecondary}
              autoCorrect={false}
              editable={!saving}
            />
            {countrySearch.trim() !== '' && (
              <View style={[styles.chipsRow, styles.chipsRowMt]}>
                {filteredCountries.length === 0 ? (
                  <Text style={styles.noMatchText}>
                    {t('profileEdit.noCountryFound')}
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
                {t('profileEdit.verifiedNotice')}
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: c.textPrimary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navRowText: { flex: 1, fontSize: 16, color: c.textPrimary, fontWeight: '500' },
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
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
