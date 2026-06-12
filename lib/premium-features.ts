import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

// 各セルの値: true=利用可, false=不可, string=内容(件数など)
export type PlanCell = boolean | string;

export type PlanFeatureRow = {
  iconName: IoniconName;
  titleKey: string;
  free: PlanCell;
  plus: PlanCell;
  pro: PlanCell;
};

/** プラン比較表の行データ (Free / Plus / Pro)。 */
export const PLAN_FEATURES: PlanFeatureRow[] = [
  {
    iconName: 'create-outline',
    titleKey: 'premium.feat_records',
    free: '15',
    plus: '30',
    pro: '∞',
  },
  {
    iconName: 'chatbubbles-outline',
    titleKey: 'premium.feat_posts',
    free: '∞',
    plus: '∞',
    pro: '∞',
  },
  {
    iconName: 'remove-circle-outline',
    titleKey: 'premium.feat_noads',
    free: false,
    plus: true,
    pro: true,
  },
  {
    iconName: 'bar-chart-outline',
    titleKey: 'premium.feat_analytics',
    free: false,
    plus: true,
    pro: true,
  },
  {
    iconName: 'grid-outline',
    titleKey: 'premium.feat_csv',
    free: true,
    plus: true,
    pro: true,
  },
  {
    iconName: 'book-outline',
    titleKey: 'premium.feat_lessons',
    free: '5',
    plus: true,
    pro: true,
  },
  {
    iconName: 'document-text-outline',
    titleKey: 'premium.feat_pdf',
    free: false,
    plus: false,
    pro: true,
  },
  {
    iconName: 'share-social-outline',
    titleKey: 'premium.feat_share',
    free: false,
    plus: false,
    pro: true,
  },
  {
    iconName: 'sparkles-outline',
    titleKey: 'premium.feat_ai',
    free: false,
    plus: false,
    pro: true,
  },
  {
    iconName: 'star-outline',
    titleKey: 'premium.feat_badges',
    free: false,
    plus: false,
    pro: true,
  },
  {
    iconName: 'people-outline',
    titleKey: 'premium.feat_community',
    free: false,
    plus: false,
    pro: true,
  },
];
