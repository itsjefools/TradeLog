import { Linking } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * 外部アフィリエイトリンクを開く共通処理。
 * - http(s) のみ許可（安全性チェック）
 * - 任意のクリック計測（school_affiliate_clicks があれば記録、無ければ握りつぶす）
 *
 * 日本のステマ規制（景表法）対応として、リンクを出す画面側では必ず
 * `PR`/広告 のラベルと開示文（school.affiliateDisclosure）を併記すること。
 */
export type AffiliateKind = 'book' | 'broker' | 'tool' | 'other';

export async function openAffiliate(
  url: string | null | undefined,
  meta?: { kind?: AffiliateKind; itemId?: string },
): Promise<boolean> {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;

  // クリック計測（ベストエフォート。テーブルが無くてもエラーにしない）
  void logAffiliateClick(url, meta);

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function logAffiliateClick(
  url: string,
  meta?: { kind?: AffiliateKind; itemId?: string },
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id ?? null;
    await supabase.from('school_affiliate_clicks').insert({
      user_id: userId,
      url,
      kind: meta?.kind ?? 'other',
      item_id: meta?.itemId ?? null,
    });
  } catch {
    // テーブル未作成・権限なし等はサイレントに無視（計測は任意）
  }
}
