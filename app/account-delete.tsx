import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const CONFIRM_PHRASE = '削除';

const DELETION_ITEMS = [
  'プロフィール（アバター・自己紹介・国籍・トレードスタイル）',
  '全ての取引記録',
  '全ての投稿・コメント・いいね・ブックマーク・リポスト',
  'フォロー関係（双方向）',
  '送受信した DM の全履歴',
  '通知履歴',
  '購入履歴（サブスクリプションは別途 App Store / Google Play で解約してください）',
];

export default function AccountDeleteScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const email = session?.user.email ?? '';
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === CONFIRM_PHRASE && !deleting;

  const handleDelete = () => {
    Alert.alert(
      '本当に削除しますか？',
      'この操作は取り消せません。\n全てのデータが完全に削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_my_account');
              if (error) throw new Error(error.message);
              await supabase.auth.signOut();
              // signOut で自動的に /login へリダイレクトされる
            } catch (e) {
              setDeleting(false);
              Alert.alert(
                '削除に失敗しました',
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
        <Text style={styles.headerTitle}>アカウントを削除</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={28} color="#fff" />
          </View>
          <Text style={styles.warningTitle}>この操作は取り消せません</Text>
          <Text style={styles.warningBody}>
            アカウントを削除すると、{email && `${email} に関連する `}以下のデータが完全に削除されます。
          </Text>
        </View>

        <Text style={styles.sectionLabel}>削除されるデータ</Text>
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
          style={styles.input}
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
            <Text style={styles.deleteButtonText}>アカウントを完全に削除</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.cancelButton}
          disabled={deleting}
        >
          <Text style={styles.cancelButtonText}>やめる</Text>
        </Pressable>
      </ScrollView>
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
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.danger,
      gap: 10,
    },
    warningIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
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
      borderRadius: 14,
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
      borderRadius: 12,
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
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: c.textPrimary,
    },
    deleteButton: {
      backgroundColor: c.danger,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      minHeight: 52,
    },
    deleteButtonDisabled: {
      opacity: 0.4,
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
