import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type PremiumFeature = {
  iconName: IoniconName;
  titleKey: string;
  descriptionKey: string;
  // free: true=利用可, false=不可, string=制限内容(件数など)
  free: boolean | string;
  premium: boolean | string;
};

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    iconName: 'book-outline',
    titleKey: 'premium.feature_lessons',
    descriptionKey: 'premium.feature_lessons_desc',
    free: '5',
    premium: true,
  },
  {
    iconName: 'bar-chart-outline',
    titleKey: 'premium.feature_stats',
    descriptionKey: 'premium.feature_stats_desc',
    free: false,
    premium: true,
  },
  {
    iconName: 'download-outline',
    titleKey: 'premium.feature_export',
    descriptionKey: 'premium.feature_export_desc',
    free: false,
    premium: true,
  },
  {
    iconName: 'image-outline',
    titleKey: 'premium.feature_wallpaper',
    descriptionKey: 'premium.feature_wallpaper_desc',
    free: '3',
    premium: true,
  },
  {
    iconName: 'star-outline',
    titleKey: 'premium.feature_badge',
    descriptionKey: 'premium.feature_badge_desc',
    free: false,
    premium: true,
  },
  {
    iconName: 'people-outline',
    titleKey: 'premium.feature_community',
    descriptionKey: 'premium.feature_community_desc',
    free: false,
    premium: true,
  },
];
