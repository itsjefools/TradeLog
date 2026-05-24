import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme';

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function displayWebsite(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

/**
 * プロフィールの Web サイト / X(Twitter) ハンドルをタップ可能なリンクとして表示する。
 * profile-edit で設定した値の閲覧用（バグ#13）。
 */
export function ProfileLinks({
  website,
  twitter,
}: {
  website?: string | null;
  twitter?: string | null;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const hasWebsite = !!website && website.trim() !== '';
  const handle = twitter ? normalizeHandle(twitter) : '';
  const hasTwitter = handle !== '';

  if (!hasWebsite && !hasTwitter) return null;

  return (
    <View style={styles.row}>
      {hasWebsite ? (
        <Pressable
          style={styles.item}
          hitSlop={6}
          onPress={() =>
            WebBrowser.openBrowserAsync(normalizeUrl(website as string))
          }
        >
          <Ionicons name="globe-outline" size={14} color={c.accent} />
          <Text style={styles.text} numberOfLines={1}>
            {displayWebsite(website as string)}
          </Text>
        </Pressable>
      ) : null}
      {hasTwitter ? (
        <Pressable
          style={styles.item}
          hitSlop={6}
          onPress={() => WebBrowser.openBrowserAsync(`https://x.com/${handle}`)}
        >
          <Ionicons name="logo-twitter" size={14} color={c.accent} />
          <Text style={styles.text} numberOfLines={1}>
            @{handle}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginTop: 6,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 200 },
    text: { fontSize: 13, color: c.accent, fontWeight: '500' },
  });
}
