import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'post' | 'comment' | 'user';

const REPORT_REASONS = [
  { code: 'spam', label: 'スパム・宣伝' },
  { code: 'harassment', label: '嫌がらせ・いじめ' },
  { code: 'hate_speech', label: 'ヘイトスピーチ・差別' },
  { code: 'sexual', label: '性的に不適切な内容' },
  { code: 'violence', label: '暴力的・有害な内容' },
  { code: 'misinformation', label: '誤情報・詐欺' },
  { code: 'impersonation', label: 'なりすまし' },
  { code: 'other', label: 'その他' },
] as const;

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string | null;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
    }
  }, [visible]);

  const targetLabel =
    targetType === 'post' ? '投稿' : targetType === 'comment' ? 'コメント' : 'ユーザー';

  const handleSubmit = async () => {
    if (!reason || !targetId || !session) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session.user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw new Error(error.message);
      Alert.alert(
        '通報しました',
        'ご報告ありがとうございます。\n内容を確認のうえ対応します。',
        [{ text: 'OK', onPress: onClose }],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('通報失敗', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerLink}>キャンセル</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{targetLabel}を通報</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!reason || submitting}
            hitSlop={12}
          >
            {submitting ? (
              <ActivityIndicator color={c.accent} />
            ) : (
              <Text
                style={[
                  styles.headerLink,
                  styles.submitLink,
                  (!reason || submitting) && styles.submitLinkDisabled,
                ]}
              >
                送信
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.intro}>
            この{targetLabel}を通報する理由を選んでください。{'\n'}
            通報内容はモデレーターのみが確認します。
          </Text>

          <Text style={styles.sectionLabel}>理由</Text>
          <View style={styles.card}>
            {REPORT_REASONS.map((r, i) => {
              const selected = reason === r.code;
              return (
                <View key={r.code}>
                  <Pressable
                    onPress={() => setReason(r.code)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                    hitSlop={4}
                  >
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    {selected && (
                      <Ionicons name="checkmark" size={20} color={c.accent} />
                    )}
                  </Pressable>
                  {i < REPORT_REASONS.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelMt]}>
            詳細（任意）
          </Text>
          <TextInput
            style={styles.input}
            value={details}
            onChangeText={setDetails}
            placeholder="具体的な状況があれば記入してください"
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={500}
            editable={!submitting}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
    headerLink: {
      fontSize: 15,
      color: c.textSecondary,
      minWidth: 56,
    },
    submitLink: {
      color: c.accent,
      fontWeight: '700',
      textAlign: 'right',
    },
    submitLinkDisabled: {
      opacity: 0.4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    body: {
      padding: 20,
      paddingBottom: 60,
    },
    intro: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionLabelMt: {
      marginTop: 24,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 52,
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    rowLabel: {
      fontSize: 14,
      color: c.textPrimary,
      fontWeight: '500',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 14,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: c.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
  });
}
