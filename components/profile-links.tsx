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

// YouTube の入力を開けるURLに整える。
// - フルURL(http/https) はそのまま
// - @handle は youtube.com/@handle
// - それ以外は youtube.com/@value とみなす
function youtubeUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^youtube\.com|^youtu\.be/i.test(t)) return `https://${t}`;
  const handle = t.replace(/^@+/, '');
  return `https://youtube.com/@${handle}`;
}

function displayYoutube(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t) || /^youtube\.com|^youtu\.be/i.test(t)) {
    return t.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
  return `@${t.replace(/^@+/, '')}`;
}

/**
 * プロフィールの URL / YouTube をタップ可能なリンクとして表示する。
 * profile-edit で設定した値の閲覧用。
 */
export function ProfileLinks({
  website,
  youtube,
}: {
  website?: string | null;
  youtube?: string | null;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const hasWebsite = !!website && website.trim() !== '';
  const hasYoutube = !!youtube && youtube.trim() !== '';

  if (!hasWebsite && !hasYoutube) return null;

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
      {hasYoutube ? (
        <Pressable
          style={styles.item}
          hitSlop={6}
          onPress={() => WebBrowser.openBrowserAsync(youtubeUrl(youtube as string))}
        >
          <Ionicons name="logo-youtube" size={14} color={c.accent} />
          <Text style={styles.text} numberOfLines={1}>
            {displayYoutube(youtube as string)}
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
