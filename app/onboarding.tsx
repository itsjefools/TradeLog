import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/hooks/use-i18n';
import { useOnboarding } from '@/hooks/use-onboarding';
import { AnalyticsEvents } from '@/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  titleKey: string;
  descKey: string;
  color: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'trending-up-outline',
    titleKey: 'onboarding.slide1_title',
    descKey: 'onboarding.slide1_desc',
    color: '#10B981',
  },
  {
    icon: 'people-outline',
    titleKey: 'onboarding.slide2_title',
    descKey: 'onboarding.slide2_desc',
    color: '#3B82F6',
  },
  {
    icon: 'school-outline',
    titleKey: 'onboarding.slide3_title',
    descKey: 'onboarding.slide3_desc',
    color: '#8B5CF6',
  },
  {
    icon: 'shield-checkmark-outline',
    titleKey: 'onboarding.slide4_title',
    descKey: 'onboarding.slide4_desc',
    color: '#F59E0B',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { markCompleted } = useOnboarding();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [page, setPage] = useState(0);

  const isLast = page === SLIDES.length - 1;
  const activeColor = SLIDES[page].color;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) setPage(next);
  };

  const finish = async () => {
    await markCompleted();
    router.replace('/login');
  };

  const handleNext = () => {
    if (isLast) {
      AnalyticsEvents.onboardingCompleted();
      finish();
      return;
    }
    flatListRef.current?.scrollToIndex({ index: page + 1, animated: true });
    setPage(page + 1);
  };

  const handleSkip = () => {
    AnalyticsEvents.onboardingSkipped(page);
    finish();
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View
        style={[styles.iconWrap, { backgroundColor: `${item.color}1F` }]}
      >
        <Ionicons name={item.icon} size={44} color={item.color} />
      </View>
      <Text style={styles.title}>{t(item.titleKey)}</Text>
      <Text style={styles.desc}>{t(item.descKey)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleSkip} hitSlop={10} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.titleKey}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onScroll}
        style={styles.list}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, i) => {
            const isActive = i === page;
            return (
              <View
                key={slide.titleKey}
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isActive && { backgroundColor: slide.color },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.ctaButton, { backgroundColor: activeColor }]}
        >
          <Text style={styles.ctaText}>
            {isLast ? t('onboarding.get_started') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
  },
  list: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.1,
    maxWidth: 320,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 24,
  },
  ctaButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
