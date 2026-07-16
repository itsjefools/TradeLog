import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 50) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.8;

type Template = {
  id: string;
  name: string;
  image_url: string;
  category: string;
  is_premium: boolean;
};

export function WallpaperTemplates() {
  const c = useThemeColors();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('wallpaper_backgrounds')
        .select('*')
        .order('sort_order');
      if (cancelled) return;
      setTemplates((data ?? []) as Template[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async (imageUrl: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true, [
        'photo',
      ]);
      if (status !== 'granted') {
        Alert.alert('', t('wallpaper.permission_required'));
        return;
      }
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const fileUri = `${cacheDir}wallpaper_template_${Date.now()}.png`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('wallpaper.saved_title'), t('wallpaper.saved_private'));
    } catch {
      Alert.alert(t('wallpaper.error'), t('wallpaper.save_failed'));
    }
  };

  if (loading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyHint}>...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={templates}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      bounces={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => handleDownload(item.image_url)}
          activeOpacity={0.85}
          style={styles.card}
        >
          <Image
            source={{ uri: item.image_url }}
            style={styles.cardImage}
            contentFit="cover"
          />
          <View style={styles.downloadBadge}>
            <Ionicons name="download-outline" size={16} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎨</Text>
          <Text style={styles.emptyHint}>{t('wallpaper.templates_coming_soon')}</Text>
        </View>
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    listContent: { padding: 15, paddingBottom: 40 },
    columnWrapper: { gap: 10 },
    card: { marginBottom: 10 },
    cardImage: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
    },
    downloadBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: c.textSecondary },
  });
}
