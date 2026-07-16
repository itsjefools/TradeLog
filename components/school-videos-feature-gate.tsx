import { Redirect } from 'expo-router';
import { type PropsWithChildren } from 'react';

import { SCHOOL_VIDEOS_ENABLED } from '@/lib/feature-flags';

/** 非公開中のスクール動画への直接アクセスを学校トップへ戻す。 */
export function SchoolVideosFeatureGate({ children }: PropsWithChildren) {
  if (!SCHOOL_VIDEOS_ENABLED) {
    return <Redirect href="/school" />;
  }

  return children;
}
