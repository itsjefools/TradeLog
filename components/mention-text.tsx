// メンション (@user) とハッシュタグ (#tag) をリンク化するテキストコンポーネント

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

type Props = {
  content: string;
  style?: TextStyle | TextStyle[];
};

export function MentionText({ content, style }: Props) {
  const c = useThemeColors();
  const router = useRouter();

  const parts = useMemo(() => parseContent(content), [content]);

  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.type === 'text') {
          return <Text key={i}>{p.value}</Text>;
        }
        if (p.type === 'mention') {
          return (
            <Text
              key={i}
              style={[styles.link, { color: c.accent }]}
              onPress={() => {
                // ユーザー名 → user_id への解決はサーバ側で必要だが、簡易には username で検索画面へ
                router.push(`/search?tag=${p.value}`);
              }}
            >
              @{p.value}
            </Text>
          );
        }
        // hashtag
        return (
          <Text
            key={i}
            style={[styles.link, { color: c.accent }]}
            onPress={() => router.push(`/search?tag=${p.value}`)}
          >
            #{p.value}
          </Text>
        );
      })}
    </Text>
  );
}

type Part =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'hashtag'; value: string };

function parseContent(content: string): Part[] {
  const regex = /([@#])([A-Za-z0-9_ぁ-ゟ゠-ヿ一-龯]+)/g;
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: match[1] === '@' ? 'mention' : 'hashtag',
      value: match[2],
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return parts;
}

const styles = StyleSheet.create({
  link: {
    fontWeight: '600',
  },
});
