import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemeMode } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { SUPPORTED_LOCALES, useI18n } from '@/hooks/use-i18n';
import { useProfile } from '@/hooks/use-profile';
import { useTheme, useThemeColors } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { mode, setMode } = useTheme();
  const { locale } = useI18n();

  const email = session?.user.email ?? '';
  const fallbackName = email.split('@')[0] || 'ユーザー';
  const displayName =
    profile?.display_name?.trim() || profile?.username?.trim() || fallbackName;
  const username = profile?.username?.trim() || fallbackName;

  const themeOptions: { value: ThemeMode; label: string }[] = useMemo(
    () => [
      { value: 'system', label: 'システム' },
      { value: 'light', label: 'ライト' },
      { value: 'dark', label: 'ダーク' },
    ],
    [],
  );

  const currentLocaleLabel =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.label ?? '日本語';

  const handleLogout = () => {
    Alert.alert('ログアウト', '本当にログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('エラー', error.message);
            return;
          }
          router.replace('/login');
        },
      },
    ]);
  };

  // Inline SettingRow
  const SettingRow = ({
    icon,
    label,
    onPress,
    color,
    rightElement,
  }: {
    icon: IoniconName;
    label: string;
    onPress?: () => void;
    color?: string;
    rightElement?: React.ReactNode;
  }) => {
    const right =
      rightElement !== undefined ? (
        rightElement
      ) : (
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      );
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          name={icon}
          size={24}
          color={color || c.textPrimary}
          style={{ width: 32 }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '400',
            color: color || c.textPrimary,
            marginLeft: 12,
          }}
        >
          {label}
        </Text>
        {right}
      </TouchableOpacity>
    );
  };

  // Inline SectionTitle
  const SectionTitle = ({ title }: { title: string }) => (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );

  // Inline Divider
  const Divider = () => (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.border,
        marginHorizontal: 16,
      }}
    />
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={['top', 'bottom']}
    >
      {/* ヘッダー */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: c.textPrimary,
          }}
        >
          設定とアクティビティ
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* プロフィール行 */}
        <TouchableOpacity
          onPress={() => router.push('/profile-edit')}
          activeOpacity={0.6}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <Avatar
            uri={profile?.avatar_url}
            displayName={displayName}
            size={48}
            profile={profile}
            showPremiumBadge={false}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: c.textPrimary,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={{ fontSize: 14, color: c.textSecondary }}
              numberOfLines={1}
            >
              @{username}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={c.textSecondary}
          />
        </TouchableOpacity>

        <Divider />

        <SectionTitle title="アカウント" />
        <SettingRow
          icon="person-outline"
          label="プロフィールを編集"
          onPress={() => router.push('/profile-edit')}
        />
        <SettingRow
          icon="document-text-outline"
          label="取引履歴"
          onPress={() => router.push('/trade-history')}
        />
        <SettingRow
          icon="bookmark-outline"
          label="ブックマーク"
          onPress={() => router.push('/bookmarks')}
        />

        <Divider />

        <SectionTitle title="ツール" />
        <SettingRow
          icon="flag-outline"
          label="月間目標"
          onPress={() => router.push('/goal-edit')}
        />
        <SettingRow
          icon="calculator-outline"
          label="リスク計算機"
          onPress={() => router.push('/risk-calculator')}
        />
        <SettingRow
          icon="calendar-outline"
          label="経済指標カレンダー"
          onPress={() => router.push('/economic-calendar')}
        />
        <SettingRow
          icon="book-outline"
          label="用語集"
          onPress={() => router.push('/glossary')}
        />

        <Divider />

        <SectionTitle title="表示" />
        <SettingRow
          icon="color-palette-outline"
          label="テーマ"
          rightElement={
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: c.surfaceAlt,
                borderRadius: 9,
                padding: 2,
              }}
            >
              {themeOptions.map((opt) => {
                const selected = mode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 7,
                      minWidth: 50,
                      alignItems: 'center',
                      backgroundColor: selected ? c.accent : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: selected ? '700' : '600',
                        color: selected ? '#fff' : c.textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          }
        />
        <SettingRow
          icon="globe-outline"
          label="言語"
          onPress={() => router.push('/language-edit')}
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 14,
                  color: c.textSecondary,
                  marginRight: 6,
                }}
                numberOfLines={1}
              >
                {currentLocaleLabel}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={c.textSecondary}
              />
            </View>
          }
        />

        <Divider />

        <SectionTitle title="プランと課金" />
        <SettingRow
          icon="star-outline"
          label="Premium プラン"
          onPress={() => router.push('/premium')}
        />

        <Divider />

        <SectionTitle title="プライバシーと安全" />
        <SettingRow
          icon="ban-outline"
          label="ブロック中のユーザー"
          onPress={() => router.push('/blocked-users')}
        />
        <SettingRow
          icon="trash-outline"
          label="アカウントを削除"
          color="#FF3B30"
          onPress={() => router.push('/account-delete')}
          rightElement={null}
        />

        <Divider />

        <SectionTitle title="法的事項" />
        <SettingRow
          icon="document-outline"
          label="利用規約"
          onPress={() => router.push('/terms')}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="プライバシーポリシー"
          onPress={() => router.push('/privacy')}
        />

        <Divider />

        {/* ログアウト */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.6}
          style={{ paddingVertical: 20, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, color: '#FF3B30' }}>ログアウト</Text>
        </TouchableOpacity>

        {/* バージョン */}
        <Text
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#8E8E93',
            paddingBottom: 40,
          }}
        >
          TradeLog v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
