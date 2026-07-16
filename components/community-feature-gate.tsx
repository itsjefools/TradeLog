import { Redirect } from 'expo-router';
import { type PropsWithChildren } from 'react';

import { COMMUNITIES_ENABLED } from '@/lib/feature-flags';

/** 非公開中のコミュニティ画面への直接アクセスを学校トップへ戻す。 */
export function CommunityFeatureGate({ children }: PropsWithChildren) {
  if (!COMMUNITIES_ENABLED) {
    return <Redirect href="/school" />;
  }

  return children;
}
