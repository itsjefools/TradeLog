import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme, useThemeColors } from '@/hooks/use-theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACCENT = '#10B981';

type Page = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

const PAGES: Page[] = [
  {
    icon: 'trending-up',
    title: '取引を、もっとスマートに',
    body: 'FXトレーダーのための記録・分析・コミュニティを、ひとつのアプリで。',
  },
  {
    icon: 'create-outline',
    title: '詳細な取引記録',
    body: '通貨ペア・損益・チャート画像・3段階メモまで。あなたのトレードを完璧に残せます。',
  },
  {
    icon: 'stats-chart',
    title: '強力な分析',
    body: '月間KPI・勝率・通貨ペア別損益・カレンダー。データで自分の成長を可視化しましょう。',
  },
  {
    icon: 'people',
    title: 'トレーダーとつながる',
    body: '他の投資家の戦略から学び、いいねやコメントで交流。世界中のトレーダーと一緒に成長できます。',
  },
];

export default function OnboardingScreen() {
  const c = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const router = useRouter();
  const { markCompleted } = useOnboarding();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const isLast = page === PAGES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_WIDTH);
    if (next !== page) setPage(next);
  };

  const handleNext = async () => {
    if (isLast) {
      await markCompleted();
      router.replace('/login');
    } else {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (page + 1),
        animated: true,
      });
    }
  };

  const handleSkip = async () => {
    await markCompleted();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoTrade}>Trade</Text>
          <Text style={styles.logoLog}>Log</Text>
        </View>
        {!isLast && (
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>スキップ</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={styles.page}>
            <View style={styles.iconWrap}>
              <Ionicons name={p.icon} size={64} color="#fff" />
            </View>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? '始める' : '次へ'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      minHeight: 56,
    },
    logoRow: {
      flexDirection: 'row',
    },
    logoTrade: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: isDark ? '#FFFFFF' : '#1E293B',
    },
    logoLog: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: ACCENT,
    },
    skipText: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    page: {
      width: SCREEN_WIDTH,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
      paddingVertical: 20,
    },
    iconWrap: {
      width: 140,
      height: 140,
      borderRadius: 36,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      shadowColor: ACCENT,
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 34,
    },
    body: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 23,
      maxWidth: 320,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    dotActive: {
      backgroundColor: ACCENT,
      width: 24,
    },
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    nextButton: {
      backgroundColor: ACCENT,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      shadowColor: ACCENT,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    nextButtonPressed: {
      opacity: 0.85,
    },
    nextButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
