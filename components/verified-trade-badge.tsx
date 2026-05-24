import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';

const VERIFIED = '#3B82F6';

/**
 * ブローカー(MT5)からインポートされた「検証済み」トレードを示すバッジ。
 * trade.source === 'mt5_import' のときに表示する。
 * FXコミュニティの「成績の盛り」問題に対する信頼の証。
 */
export function VerifiedTradeBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <View style={[styles.wrap, { backgroundColor: `${VERIFIED}1A` }]}>
      <Ionicons name="shield-checkmark" size={compact ? 10 : 12} color={VERIFIED} />
      {!compact && (
        <Text style={styles.text}>{t('common.verified')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: { fontSize: 10, fontWeight: '800', color: VERIFIED, letterSpacing: 0.3 },
});
