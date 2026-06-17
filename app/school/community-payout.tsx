import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function CommunityPayoutScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const styles = useMemo(() => makeStyles(c), [c]);

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('creator_payout_accounts')
      .select('display_name, status')
      .eq('user_id', myId)
      .maybeSingle();
    if (data) {
      setDisplayName((data.display_name as string | null) ?? '');
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!myId || !displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('creator_payout_accounts').upsert(
      {
        user_id: myId,
        method: 'bank',
        display_name: displayName.trim(),
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);
    if (error) {
      Alert.alert(t('common.error'), t('community.payout_failed'));
      return;
    }
    Alert.alert(t('community.payout_saved'));
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('community.payout_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.fieldLabel}>{t('community.payout_method')}</Text>
          <View style={styles.methodPill}>
            <Ionicons name="business-outline" size={16} color={c.textPrimary} />
            <Text style={styles.methodText}>{t('community.payout_method_bank')}</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            {t('community.payout_display_name')}
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('community.payout_display_name_ph')}
            placeholderTextColor={c.textSecondary}
            style={styles.input}
          />

          <Text style={styles.note}>{t('community.payout_note')}</Text>

          <Pressable
            onPress={save}
            disabled={saving || !displayName.trim()}
            style={[
              styles.saveButton,
              (saving || !displayName.trim()) && styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={styles.saveButtonText}>{t('community.payout_save')}</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { padding: 20 },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 8,
    },
    methodPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    methodText: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
    input: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: c.textPrimary,
    },
    note: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 18,
      marginTop: 16,
      opacity: 0.85,
    },
    saveButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 28,
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { fontSize: 16, fontWeight: '700', color: c.onAccent },
  });
}
