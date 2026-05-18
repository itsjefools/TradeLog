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

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function AccountDeleteScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const CONFIRM_PHRASE = t('accountDelete.confirmPhrase');
  const DELETION_ITEMS = [
    t('accountDelete.item1'),
    t('accountDelete.item2'),
    t('accountDelete.item3'),
    t('accountDelete.item4'),
    t('accountDelete.item5'),
    t('accountDelete.item6'),
    t('accountDelete.item7'),
  ];
  const router = useRouter();
  const { session } = useAuth();
  const email = session?.user.email ?? '';
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === CONFIRM_PHRASE && !deleting;

  const handleDelete = () => {
    // 二重ガード: disabled をバイパスされた場合の安全策
    if (confirmText.trim() !== CONFIRM_PHRASE || deleting) {
      return;
    }

    Alert.alert(
      t('accountDelete.confirmTitle'),
      t('accountDelete.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accountDelete.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            // 三重ガード: ダイアログ表示中に値が変わった場合の保険
            if (confirmText.trim() !== CONFIRM_PHRASE) return;
            setDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_my_account');
              if (error) throw new Error(error.message);
              await supabase.auth.signOut();
              // signOut で自動的に /login へリダイレクトされる
            } catch (e) {
              setDeleting(false);
              Alert.alert(
                t('accountDelete.deleteFail'),
                e instanceof Error ? e.message : String(e),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('accountDelete.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={28} color="#fff" />
          </View>
          <Text style={styles.warningTitle}>{t('accountDelete.warningTitle')}</Text>
          <Text style={styles.warningBody}>
            アカウントを削除すると、{email && `${email} に関連する `}以下のデータが完全に削除されます。
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{t('accountDelete.sectionLabel')}</Text>
        <View style={styles.itemsCard}>
          {DELETION_ITEMS.map((item, i) => (
            <View key={item}>
              <View style={styles.itemRow}>
                <Ionicons name="close-circle" size={16} color={c.danger} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
              {i < DELETION_ITEMS.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.subscriptionNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={c.textSecondary}
          />
          <Text style={styles.subscriptionNoteText}>
            Premium サブスクリプションは自動解約されません。{'\n'}
            App Store / Google Play の設定からご自身で解約してください。
          </Text>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
          確認のため「{CONFIRM_PHRASE}」と入力してください
        </Text>
        <TextInput
          style={[
            styles.input,
            canDelete && styles.inputMatched,
          ]}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={CONFIRM_PHRASE}
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!deleting}
        />

        <Pressable
          onPress={handleDelete}
          disabled={!canDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            !canDelete && styles.deleteButtonDisabled,
            pressed && canDelete && styles.deleteButtonPressed,
          ]}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>{t('accountDelete.deleteButton')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.cancelButton}
          disabled={deleting}
        >
          <Text style={styles.cancelButtonText}>{t('accountDelete.cancelButton')}</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    headerSpacer: { width: 40 },
    body: { padding: 20, paddingBottom: 60 },
    warningCard: {
      backgroundColor: c.surface,
      borderRadius: 6,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.danger,
      gap: 10,
    },
    warningIcon: {
      width: 56,
      height: 56,
      borderRadius: 6,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    warningTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.danger,
      textAlign: 'center',
    },
    warningBody: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    sectionLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionLabelMt: {
      marginTop: 24,
    },
    itemsCard: {
      backgroundColor: c.surface,
      borderRadius: 6,
      paddingHorizontal: 14,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    itemText: {
      flex: 1,
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 19,
    },
    itemDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 26,
    },
    subscriptionNote: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: c.surfaceAlt,
      borderRadius: 6,
      padding: 14,
      marginTop: 16,
      alignItems: 'flex-start',
    },
    subscriptionNoteText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 18,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: c.textPrimary,
    },
    inputMatched: {
      borderColor: c.danger,
      borderWidth: 2,
    },
    deleteButton: {
      backgroundColor: c.danger,
      borderRadius: 6,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      minHeight: 52,
    },
    deleteButtonDisabled: {
      backgroundColor: '#FFB3B0',
      opacity: 0.5,
    },
    deleteButtonPressed: {
      opacity: 0.85,
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    cancelButton: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    cancelButtonText: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '600',
    },
  });
}
