import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { PremiumGate } from '@/components/premium-gate';
import { PremiumTag } from '@/components/premium-tag';
import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useTrades } from '@/hooks/use-trades';
import { computeInsights, Insight, InsightSeverity } from '@/lib/trade-insights';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function AiReviewScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { trades } = useTrades();
  const { profile } = useProfile();

  const insights = useMemo(
    () => computeInsights(trades, profile?.currency),
    [trades, profile?.currency],
  );

  const hasTrades = trades.length > 0;

  // severity ごとの色とアイコン
  const severityStyle = (
    severity: InsightSeverity,
  ): { color: string; icon: IoniconName } => {
    switch (severity) {
      case 'good':
        return { color: c.win, icon: 'checkmark-circle' };
      case 'warning':
        return { color: c.loss, icon: 'alert-circle' };
      case 'tip':
      default:
        return { color: c.accent, icon: 'bulb-outline' };
    }
  };

  // textParams の {{weekday}}/{{tag}} は翻訳キー参照なので t() で解決してから補間する
  function renderInsightText(insight: Insight): string {
    const params: Record<string, string | number> = {};
    if (insight.textParams) {
      for (const [k, v] of Object.entries(insight.textParams)) {
        if (
          typeof v === 'string' &&
          (v.startsWith('record.') || v.startsWith('tags.'))
        ) {
          // 翻訳キーが無い(カスタムタグ等)場合は末尾のキー名をそのまま使う
          const resolved = t(v);
          params[k] = resolved.includes('missing')
            ? v.split('.').pop() ?? v
            : resolved;
        } else {
          params[k] = v;
        }
      }
    }
    return t(`aiReview.${insight.textKey}`, params);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="analytics-outline" size={18} color={c.accent} />
          <Text style={styles.headerTitle}>{t('aiReview.title')}</Text>
          <PremiumTag tier="pro" />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <PremiumGate feature="ai_review" requiredTier="pro">
        <ScrollView contentContainerStyle={styles.body}>
          {!hasTrades ? (
            <EmptyState
              icon="analytics-outline"
              title={t('aiReview.title')}
              subtitle={t('aiReview.empty')}
            />
          ) : (
            <>
              <View style={styles.introCard}>
                <Ionicons
                  name="flash-outline"
                  size={22}
                  color={c.accent}
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.introText}>{t('aiReview.desc')}</Text>
              </View>

              <Text style={styles.sectionTitle}>
                {t('aiReview.sectionTitle')}
              </Text>

              {insights.map((insight) => {
                const s = severityStyle(insight.severity);
                return (
                  <View key={insight.id} style={styles.insightCard}>
                    <Ionicons name={s.icon} size={22} color={s.color} />
                    <Text style={styles.insightText}>
                      {renderInsightText(insight)}
                    </Text>
                  </View>
                );
              })}

              <Text style={styles.disclaimer}>{t('aiReview.disclaimer')}</Text>
            </>
          )}
        </ScrollView>
      </PremiumGate>
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
    headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSpacer: { width: 26 },
    body: { padding: 20, paddingBottom: 60, gap: 12 },
    introCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 18,
    },
    introText: { fontSize: 14, color: c.textPrimary, lineHeight: 21 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
    },
    insightText: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 21,
    },
    disclaimer: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
      marginTop: 8,
    },
  });
}
