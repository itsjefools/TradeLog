import { ActivityIndicator, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

export function LoadingView() {
  const c = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.background,
      }}
    >
      <ActivityIndicator size="small" color={c.textSecondary} />
    </View>
  );
}
