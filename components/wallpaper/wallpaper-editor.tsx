import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WALLPAPER_WIDTH = SCREEN_WIDTH - 40;
const WALLPAPER_HEIGHT = WALLPAPER_WIDTH * (19.5 / 9);

type Locale = 'ja' | 'en' | 'pt' | 'es';

type Background = {
  id: string;
  name: string;
  image_url: string;
  category: string;
  // ソリッドカラーのみで使うカスタムフィールド
  solid_color?: string;
};

type Rule = {
  id: string;
  text_ja: string;
  text_en: string;
  text_pt: string;
  text_es: string;
  category: 'risk' | 'entry' | 'exit' | 'mindset' | 'discipline';
  sort_order: number;
};

const SOLID_BACKGROUNDS: Background[] = [
  { id: 'solid-black', name: 'Black', image_url: '', category: 'solid', solid_color: '#000000' },
  { id: 'solid-dark', name: 'Dark Gray', image_url: '', category: 'solid', solid_color: '#111111' },
  { id: 'solid-navy', name: 'Navy', image_url: '', category: 'solid', solid_color: '#0A1628' },
  { id: 'solid-forest', name: 'Forest', image_url: '', category: 'solid', solid_color: '#0A1F0A' },
];

const RULE_CATEGORIES: Rule['category'][] = ['risk', 'mindset', 'discipline', 'entry', 'exit'];

function pickRuleText(rule: Rule, lang: Locale): string {
  const v = rule[`text_${lang}` as keyof Rule];
  if (typeof v === 'string' && v.length > 0) return v;
  return rule.text_en || rule.text_ja;
}

type Step = 'background' | 'rules' | 'preview';

export function WallpaperEditor() {
  const c = useThemeColors();
  const { t, locale } = useI18n();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c), [c]);
  const viewShotRef = useRef<ViewShot>(null);

  const lang: Locale = (['ja', 'en', 'pt', 'es'] as const).includes(locale as Locale)
    ? (locale as Locale)
    : 'en';

  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedBg, setSelectedBg] = useState<Background>(SOLID_BACKGROUNDS[0]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('background');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [bgRes, rulesRes] = await Promise.all([
        supabase.from('wallpaper_backgrounds').select('*').order('sort_order'),
        supabase.from('wallpaper_rules').select('*').order('sort_order'),
      ]);
      if (cancelled) return;
      setBackgrounds((bgRes.data ?? []) as Background[]);
      setRules((rulesRes.data ?? []) as Rule[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allBackgrounds = useMemo(
    () => [...SOLID_BACKGROUNDS, ...backgrounds],
    [backgrounds],
  );

  const toggleRule = (ruleId: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : prev.length < 5
          ? [...prev, ruleId]
          : prev,
    );
  };

  const wallpaperLines = useMemo(() => {
    const lines: string[] = [];
    selectedRules.forEach((ruleId) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule) lines.push(pickRuleText(rule, lang));
    });
    customText
      .trim()
      .split('\n')
      .forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) lines.push(trimmed);
      });
    return lines;
  }, [selectedRules, customText, rules, lang]);

  const handleSave = async (isPublic: boolean) => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true, [
        'photo',
      ]);
      if (status !== 'granted') {
        Alert.alert('', t('wallpaper.permission_required'));
        setSaving(false);
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        width: 1170,
        height: 2532,
      });

      await MediaLibrary.saveToLibraryAsync(uri);

      if (isPublic) {
        const userId = session?.user.id;
        if (userId) {
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();
          const fileName = `wallpapers/${userId}/${Date.now()}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/png',
              upsert: false,
            });
          if (!uploadError && uploadData) {
            const {
              data: { publicUrl },
            } = supabase.storage.from('post-images').getPublicUrl(uploadData.path);
            const bgId = selectedBg.id.startsWith('solid-') ? null : selectedBg.id;
            await supabase.from('user_wallpapers').insert({
              user_id: userId,
              image_url: publicUrl,
              background_id: bgId,
              rules_text: wallpaperLines.join('\n'),
              is_public: true,
            });
          }
        }
      }

      Alert.alert(
        t('wallpaper.saved_title'),
        isPublic ? t('wallpaper.saved_public') : t('wallpaper.saved_private'),
      );
    } catch {
      Alert.alert(t('wallpaper.error'), t('wallpaper.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  if (step === 'background') {
    const tileSize = (WALLPAPER_WIDTH - 20) / 3;
    return (
      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <Text style={styles.stepTitle}>{t('wallpaper.step_1')}</Text>
        <Text style={styles.stepHint}>{t('wallpaper.choose_background')}</Text>

        <View style={styles.bgGrid}>
          {allBackgrounds.map((bg) => {
            const isSelected = selectedBg.id === bg.id;
            const isSolid = !!bg.solid_color;
            return (
              <TouchableOpacity
                key={bg.id}
                onPress={() => setSelectedBg(bg)}
                activeOpacity={0.85}
                style={[
                  styles.bgTile,
                  {
                    width: tileSize,
                    height: tileSize * 1.8,
                    borderColor: isSelected ? c.accent : c.border,
                    borderWidth: isSelected ? 2.5 : 1,
                    backgroundColor: isSolid ? bg.solid_color : c.surfaceAlt,
                  },
                ]}
              >
                {!isSolid && bg.image_url ? (
                  <Image
                    source={{ uri: bg.image_url }}
                    style={styles.bgTileImage}
                    contentFit="cover"
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => setStep('rules')}
          activeOpacity={0.85}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{t('wallpaper.next')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'rules') {
    return (
      <ScrollView
        contentContainerStyle={styles.body}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{t('wallpaper.step_2')}</Text>
        <Text style={styles.stepHint}>{t('wallpaper.choose_rules')}</Text>

        {RULE_CATEGORIES.map((cat) => {
          const catRules = rules.filter((r) => r.category === cat);
          if (catRules.length === 0) return null;
          return (
            <View key={cat} style={styles.ruleCategoryBlock}>
              <Text style={styles.ruleCategoryLabel}>{t(`wallpaper.cat_${cat}`)}</Text>
              {catRules.map((rule) => {
                const isSelected = selectedRules.includes(rule.id);
                return (
                  <TouchableOpacity
                    key={rule.id}
                    onPress={() => toggleRule(rule.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.ruleRow,
                      isSelected && styles.ruleRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected ? styles.checkboxOn : styles.checkboxOff,
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={14} color={c.onAccent} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.ruleText,
                        isSelected && styles.ruleTextSelected,
                      ]}
                    >
                      {pickRuleText(rule, lang)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <Text style={styles.ruleCategoryLabel}>{t('wallpaper.custom_text')}</Text>
        <TextInput
          value={customText}
          onChangeText={setCustomText}
          placeholder={t('wallpaper.custom_placeholder')}
          placeholderTextColor={c.textSecondary}
          multiline
          maxLength={200}
          style={styles.customTextInput}
        />

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => setStep('background')}
            activeOpacity={0.7}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('wallpaper.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStep('preview')}
            disabled={wallpaperLines.length === 0}
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              styles.navPrimary,
              wallpaperLines.length === 0 && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>{t('wallpaper.preview')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const isSolid = !!selectedBg.solid_color;
  const bgColor = selectedBg.solid_color ?? '#000000';

  return (
    <ScrollView contentContainerStyle={styles.previewBody} bounces={false}>
      <Text style={styles.stepTitle}>{t('wallpaper.step_3')}</Text>

      <View style={styles.previewShadowWrap}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={[
            styles.viewShot,
            { width: WALLPAPER_WIDTH, height: WALLPAPER_HEIGHT },
          ]}
        >
          <View style={[styles.canvas, { backgroundColor: bgColor }]}>
            {!isSolid && selectedBg.image_url ? (
              <>
                <Image
                  source={{ uri: selectedBg.image_url }}
                  style={styles.canvasBgImage}
                  contentFit="cover"
                />
                <View style={styles.canvasBgOverlay} />
              </>
            ) : null}

            <View style={styles.canvasInner}>
              <Text style={styles.canvasHeading}>My Trading Rules</Text>

              {wallpaperLines.map((line, i) => (
                <Text key={i} style={styles.canvasLine}>
                  {line}
                </Text>
              ))}

              <Text style={styles.canvasWatermark}>TRADELOG</Text>
            </View>
          </View>
        </ViewShot>
      </View>

      <View style={styles.previewActions}>
        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saving}
          activeOpacity={0.85}
          style={[styles.primaryButton, saving && styles.disabledButton]}
        >
          {saving ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <View style={styles.buttonInline}>
              <Ionicons name="download-outline" size={18} color={c.onAccent} />
              <Text style={[styles.primaryButtonText, styles.buttonInlineText]}>
                {t('wallpaper.save_to_photos')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSave(true)}
          disabled={saving}
          activeOpacity={0.7}
          style={[styles.secondaryButton, styles.fullWidth]}
        >
          <View style={styles.buttonInline}>
            <Ionicons name="globe-outline" size={18} color={c.textPrimary} />
            <Text style={[styles.secondaryButtonText, styles.buttonInlineText]}>
              {t('wallpaper.save_and_share')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setStep('rules')}
          style={styles.linkButton}
        >
          <Text style={styles.linkButtonText}>{t('wallpaper.edit_again')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: { padding: 20, paddingBottom: 60 },
    previewBody: { padding: 20, paddingBottom: 60, alignItems: 'center' },
    stepTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 4,
      alignSelf: 'flex-start',
    },
    stepHint: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    bgGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    bgTile: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    bgTileImage: { width: '100%', height: '100%' },
    primaryButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.onAccent,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.border,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    navRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    navPrimary: { flex: 1, marginTop: 0 },
    disabledButton: { opacity: 0.4 },
    ruleCategoryBlock: { marginBottom: 18 },
    ruleCategoryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    ruleRowSelected: {
      backgroundColor: `${c.accent}14`,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkboxOn: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    checkboxOff: {
      backgroundColor: 'transparent',
      borderColor: c.textSecondary,
    },
    ruleText: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
    },
    ruleTextSelected: { fontWeight: '600' },
    customTextInput: {
      fontSize: 14,
      color: c.textPrimary,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    previewShadowWrap: {
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      marginBottom: 24,
    },
    viewShot: {},
    canvas: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    canvasBgImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    canvasBgOverlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    canvasInner: { alignItems: 'center', width: '100%' },
    canvasHeading: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.4)',
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 32,
    },
    canvasLine: {
      fontSize: 16,
      fontWeight: '500',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 24,
      letterSpacing: 0.3,
      marginBottom: 18,
    },
    canvasWatermark: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.25)',
      marginTop: 24,
      letterSpacing: 2,
    },
    previewActions: { width: '100%', gap: 10 },
    fullWidth: { width: '100%', flex: 0 },
    buttonInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    buttonInlineText: {},
    linkButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    linkButtonText: {
      fontSize: 14,
      color: c.textSecondary,
    },
  });
}
