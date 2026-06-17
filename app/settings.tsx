import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import {
  disableDailyReminder,
  enableDailyReminder,
  isDailyReminderEnabled,
} from '@/lib/reminder';
import { supabase } from '@/lib/supabase';
import { getCurrencyInfo } from '@/lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { session } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { mode, setMode } = useTheme();
  const { locale, t } = useI18n();

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [ownsCommunity, setOwnsCommunity] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isDailyReminderEnabled().then((enabled) => {
      if (!cancelled) setReminderEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // コミュニティを1つ以上所有していれば「クリエイター収益」導線を出す。
  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    let cancelled = false;
    supabase
      .from('communities')
      .select('id')
      .eq('owner_id', uid)
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setOwnsCommunity(!!data && data.length > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const handleToggleReminder = async (next: boolean) => {
    setReminderEnabled(next);
    if (next) {
      const ok = await enableDailyReminder(
        t('reminder.title'),
        t('reminder.body'),
      );
      if (!ok) {
        setReminderEnabled(false);
        Alert.alert(
          t('reminder.permissionTitle'),
          t('reminder.permissionBody'),
        );
      }
    } else {
      await disableDailyReminder();
    }
  };

  const email = session?.user.email ?? '';
  const fallbackName = email.split('@')[0] || t('settings.defaultName');
  const displayName =
    profile?.display_name?.trim() || profile?.username?.trim() || fallbackName;
  const username = profile?.username?.trim() || fallbackName;

  const themeOptions: { value: ThemeMode; label: string }[] = useMemo(
    () => [
      { value: 'system', label: t('settings.themeShort') },
      { value: 'light', label: t('settings.themeLight') },
      { value: 'dark', label: t('settings.themeDark') },
    ],
    [t],
  );

  const currentLocaleLabel =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.label ??
    t('settings.defaultLanguageLabel');
  const currentCurrencyLabel = getCurrencyInfo(profile?.currency).code;

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert(t('common.error'), error.message);
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
          {t('settings.headerTitle')}
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

        <SectionTitle title={t('settings.account')} />
        <SettingRow
          icon="person-outline"
          label={t('settings.editProfile')}
          onPress={() => router.push('/profile-edit')}
        />
        <SettingRow
          icon="document-text-outline"
          label={t('settings.tradeHistory')}
          onPress={() => router.push('/trade-history')}
        />
        <SettingRow
          icon="bookmark-outline"
          label={t('settings.bookmarks')}
          onPress={() => router.push('/bookmarks')}
        />
        <SettingRow
          icon="download-outline"
          label={t('settings.exportData')}
          onPress={() => router.push('/export')}
        />
        <SettingRow
          icon="gift-outline"
          label={t('settings.invite')}
          onPress={() => router.push('/invite')}
        />

        <Divider />

        <SectionTitle title={t('settings.tools')} />
        <SettingRow
          icon="flag-outline"
          label={t('settings.monthlyGoal')}
          onPress={() => router.push('/goal-edit')}
        />
        <SettingRow
          icon="calculator-outline"
          label={t('settings.riskCalculator')}
          onPress={() => router.push('/risk-calculator')}
        />
        <SettingRow
          icon="calendar-outline"
          label={t('settings.economicCalendar')}
          onPress={() => router.push('/economic-calendar')}
        />
        <SettingRow
          icon="image-outline"
          label={t('settings.wallpaper')}
          onPress={() => router.push('/wallpaper')}
        />
        <SettingRow
          icon="book-outline"
          label={t('settings.glossary')}
          onPress={() => router.push('/glossary')}
        />
        <SettingRow
          icon="chatbox-ellipses-outline"
          label={t('settings.feedback')}
          onPress={() => router.push('/feedback')}
        />
        <SettingRow
          icon="notifications-outline"
          label={t('settings.reminder')}
          rightElement={
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: c.surfaceAlt, true: c.accent }}
            />
          }
        />
        <SettingRow
          icon="swap-horizontal-outline"
          label={t('settings.pipUnit')}
          rightElement={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['pips', 'points'] as const).map((u) => {
                const active = (profile?.pip_unit ?? 'pips') === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => {
                      if (!active) updateProfile({ pip_unit: u }).catch(() => {});
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: active ? c.accent : c.surfaceAlt,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: active ? '#fff' : c.textSecondary,
                      }}
                    >
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          }
        />

        <Divider />

        <SectionTitle title={t('settings.display')} />
        <SettingRow
          icon="color-palette-outline"
          label={t('settings.theme')}
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
          label={t('settings.language')}
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
        <SettingRow
          icon="cash-outline"
          label={t('settings.currency')}
          onPress={() => router.push('/currency-edit')}
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
                {currentCurrencyLabel}
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

        <SectionTitle title={t('settings.planAndBilling')} />
        <SettingRow
          icon="star-outline"
          label={t('settings.premiumPlan')}
          onPress={() => router.push('/premium')}
        />
        {ownsCommunity && (
          <SettingRow
            icon="wallet-outline"
            label={t('settings.creatorEarnings')}
            onPress={() => router.push('/school/community-earnings')}
          />
        )}
        <SettingRow
          icon="card-outline"
          label={t('settings.subscriptions')}
          onPress={() => router.push('/my-subscriptions')}
        />

        <Divider />

        <SectionTitle title={t('settings.privacyAndSafety')} />
        <SettingRow
          icon="ban-outline"
          label={t('settings.blockedUsers')}
          onPress={() => router.push('/blocked-users')}
        />
        <SettingRow
          icon="trash-outline"
          label={t('settings.deleteAccount')}
          color="#FF3B30"
          onPress={() => router.push('/account-delete')}
          rightElement={null}
        />

        <Divider />

        <SectionTitle title={t('settings.legal')} />
        <SettingRow
          icon="document-outline"
          label={t('settings.terms')}
          onPress={() => router.push('/terms')}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label={t('settings.privacy')}
          onPress={() => router.push('/privacy')}
        />

        <Divider />

        {/* ログアウト */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.6}
          style={{ paddingVertical: 20, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, color: '#FF3B30' }}>{t('settings.logout')}</Text>
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
