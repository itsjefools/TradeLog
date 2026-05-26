import { Ionicons } from '@expo/vector-icons';
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

import { useToast } from '@/components/toast';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { notifySuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { parseNumOrNull } from '@/lib/trade-math';

type Expiry = '24h' | '3d' | '1w' | 'none';

const EXPIRY_HOURS: Record<Expiry, number | null> = {
  '24h': 24,
  '3d': 72,
  '1w': 168,
  none: null,
};

export default function PredictionNewScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [entry, setEntry] = useState('');
  const [target, setTarget] = useState('');
  const [stop, setStop] = useState('');
  const [rationale, setRationale] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('3d');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!pair.trim()) {
      Alert.alert(t('predictions.title'), t('predictions.errPair'));
      return;
    }
    setSaving(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error('no session');
      const hours = EXPIRY_HOURS[expiry];
      const expires_at =
        hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
      const { error } = await supabase.from('predictions').insert({
        user_id: uid,
        currency_pair: pair.trim().toUpperCase(),
        direction,
        entry_price: parseNumOrNull(entry),
        target_price: parseNumOrNull(target),
        stop_price: parseNumOrNull(stop),
        rationale: rationale.trim() || null,
        expires_at,
      });
      if (error) throw new Error(error.message);
      notifySuccess();
      toast.success(t('predictions.posted'));
      router.back();
    } catch (e) {
      Alert.alert(t('predictions.title'), e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const expiryOptions: Expiry[] = ['24h', '3d', '1w', 'none'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} disabled={saving}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('predictions.newTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('predictions.pair')}</Text>
          <TextInput
            style={styles.input}
            value={pair}
            onChangeText={setPair}
            placeholder="USD/JPY"
            placeholderTextColor={c.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!saving}
          />

          <Text style={styles.label}>{t('predictions.direction')}</Text>
          <View style={styles.segment}>
            {(['long', 'short'] as const).map((d) => {
              const active = direction === d;
              const col = d === 'long' ? c.win : c.loss;
              return (
                <Pressable
                  key={d}
                  style={[
                    styles.segItem,
                    active && { backgroundColor: col, borderColor: col },
                  ]}
                  onPress={() => setDirection(d)}
                  disabled={saving}
                >
                  <Text
                    style={[styles.segText, active && { color: '#fff' }]}
                  >
                    {d === 'long' ? t('common.long') : t('common.short')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>{t('predictions.entry')}</Text>
              <TextInput
                style={styles.input}
                value={entry}
                onChangeText={setEntry}
                placeholder="150.00"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>TP</Text>
              <TextInput
                style={styles.input}
                value={target}
                onChangeText={setTarget}
                placeholder="151.00"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>SL</Text>
              <TextInput
                style={styles.input}
                value={stop}
                onChangeText={setStop}
                placeholder="149.50"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('predictions.rationale')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={rationale}
            onChangeText={setRationale}
            placeholder={t('predictions.rationalePlaceholder')}
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={500}
            editable={!saving}
          />

          <Text style={styles.label}>{t('predictions.expiry')}</Text>
          <View style={styles.chipsRow}>
            {expiryOptions.map((e) => {
              const active = expiry === e;
              return (
                <Pressable
                  key={e}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setExpiry(e)}
                  disabled={saving}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(`predictions.expiry_${e}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.submit, saving && { opacity: 0.6 }]}
            onPress={submit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('predictions.post')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
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
    body: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '500', color: c.textSecondary, marginBottom: 8, marginTop: 14 },
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
    multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
    row: { flexDirection: 'row', gap: 10 },
    segment: {
      flexDirection: 'row',
      gap: 10,
    },
    segItem: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    segText: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
    chipTextActive: { color: '#fff' },
    submit: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 28,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  });
}
