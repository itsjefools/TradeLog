import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { successNotification } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

type IoniconName = keyof typeof Ionicons.glyphMap;

const FEEDBACK_TYPES: { key: string; icon: IoniconName; color: string }[] = [
  { key: 'bug', icon: 'bug-outline', color: '#EF4444' },
  { key: 'feature', icon: 'bulb-outline', color: '#F59E0B' },
  { key: 'general', icon: 'chatbubble-outline', color: '#3B82F6' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline', color: '#8B5CF6' },
];

const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

export default function FeedbackScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);

  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert(t('feedback.error'), t('feedback.message_required'));
      return;
    }
    setLoading(true);
    try {
      const deviceInfo = `${Device.modelName ?? 'unknown'} / ${Platform.OS} ${Platform.Version} / App ${APP_VERSION}`;
      const { error } = await supabase.from('app_feedback').insert({
        user_id: session?.user.id ?? null,
        type,
        message: trimmed,
        app_version: APP_VERSION,
        device_info: deviceInfo,
      });
      if (error) throw new Error(error.message);

      successNotification();
      Alert.alert(t('feedback.thanks_title'), t('feedback.thanks_message'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t('feedback.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('feedback.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>{t('feedback.type')}</Text>
          <View style={styles.typeRow}>
            {FEEDBACK_TYPES.map((ft) => {
              const active = type === ft.key;
              return (
                <TouchableOpacity
                  key={ft.key}
                  onPress={() => setType(ft.key)}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: active ? ft.color : c.border,
                      backgroundColor: active ? `${ft.color}1A` : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={ft.icon}
                    size={20}
                    color={active ? ft.color : c.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      { color: active ? ft.color : c.textSecondary },
                    ]}
                  >
                    {t(`feedback.type_${ft.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{t('feedback.message')}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('feedback.placeholder')}
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Text style={styles.counter}>{message.length}/2000</Text>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !message.trim()}
            style={[
              styles.submit,
              (!message.trim() || loading) && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.submitText}>{t('feedback.send')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 26 },
    body: { padding: 24 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    typeText: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    input: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 16,
      minHeight: 150,
      fontSize: 15,
      color: c.textPrimary,
      textAlignVertical: 'top',
      lineHeight: 24,
    },
    counter: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 4,
      textAlign: 'right',
      opacity: 0.6,
    },
    submit: {
      marginTop: 24,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  });
}
