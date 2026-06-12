import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useFavoritePairs } from '@/hooks/use-favorite-pairs';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { ALL_CURRENCY_PAIRS } from '@/lib/types';

/**
 * 検索式の通貨ペアセレクタ。記録フォーム (app/(tabs)/record.tsx) の通貨ペア選択と
 * 同一の見た目・挙動を再利用可能にしたもの。value=選択中ペア、onChange=選択時コールバック。
 */
export function CurrencyPairField({
  value,
  onChange,
  editable = true,
}: {
  value: string;
  onChange: (pair: string) => void;
  editable?: boolean;
}) {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { favorites, isFavorite, toggleFavorite } = useFavoritePairs();
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const isSearching = search.trim() !== '';
  const visiblePairs = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return ALL_CURRENCY_PAIRS.filter((p) => favorites.includes(p));
    return ALL_CURRENCY_PAIRS.filter((p) => p.includes(q));
  }, [search, favorites]);

  const select = (pair: string) => {
    onChange(pair);
    setSearch('');
  };

  return (
    <View>
      {value ? (
        <Pressable
          onPress={() => {
            if (!editable) return;
            onChange('');
            setSearch('');
            setTimeout(() => searchRef.current?.focus(), 50);
          }}
          style={styles.selectedPairCard}
        >
          <Text style={styles.selectedPairCardText}>{value}</Text>
          <View style={styles.selectedPairClear}>
            <Ionicons name="close-circle" size={22} color={c.textSecondary} />
          </View>
        </Pressable>
      ) : (
        <TextInput
          ref={searchRef}
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder={t('record.pairSearchPlaceholder')}
          placeholderTextColor={c.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={editable}
        />
      )}

      {!isSearching && !value && favorites.length > 0 && (
        <Text style={styles.favHeader}>{t('record.favHeader')}</Text>
      )}

      {!value && (
        <View style={[styles.chipsRow, styles.chipsRowMt]}>
          {visiblePairs.length === 0 ? (
            <Text style={styles.noMatchText}>
              {isSearching
                ? t('record.noMatchingPair')
                : t('record.pairSearchHint')}
            </Text>
          ) : (
            visiblePairs.map((pair) => {
              const fav = isFavorite(pair);
              return (
                <Pressable
                  key={pair}
                  style={styles.chip}
                  onPress={() => select(pair)}
                >
                  <Text style={styles.chipText}>{pair}</Text>
                  <Pressable
                    onPress={() => toggleFavorite(pair)}
                    hitSlop={6}
                    style={styles.starWrap}
                  >
                    <Text style={[styles.starIcon, fav && styles.starIconActive]}>
                      {fav ? '★' : '☆'}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.textPrimary,
    },
    selectedPairCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    selectedPairCardText: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: 1,
    },
    selectedPairClear: {
      position: 'absolute',
      right: 10,
      padding: 4,
    },
    favHeader: {
      marginTop: 14,
      fontSize: 12,
      color: c.star,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipsRowMt: { marginTop: 12 },
    noMatchText: { fontSize: 13, color: c.textSecondary, paddingVertical: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipText: { fontSize: 13, color: c.textPrimary, fontWeight: '500' },
    starWrap: { marginLeft: 6 },
    starIcon: { fontSize: 14, color: c.textSecondary },
    starIconActive: { color: c.star },
  });
}
