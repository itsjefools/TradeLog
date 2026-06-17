import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * 画像下部に重ねる黒のグラデーション暗幕（スクリム）。
 * サムネイル/カバー画像の上にタイトル等をオーバーレイする際の可読性確保と、
 * カード全体の奥行き・高級感を出すために使う。
 *
 * react-native-svg は「%指定の Rect 高さが動的高の親に追従しない」不具合があるため、
 * onLayout で実寸を測って数値で渡す（[[gold-gradient]] の LuxBg と同方式）。
 *
 * @param from    暗転を開始する縦位置(0=上端,1=下端)。既定 0.4 から下を徐々に暗く。
 * @param opacity 最下部の不透明度。
 */
export function Scrim({
  from = 0.4,
  opacity = 0.88,
}: {
  from?: number;
  opacity?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        const w = Math.ceil(width);
        const h = Math.ceil(height);
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <Svg width={size.w} height={size.h} pointerEvents="none">
          <Defs>
            <LinearGradient id="scrim_b" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset={String(from)} stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity={String(opacity)} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#scrim_b)" />
        </Svg>
      )}
    </View>
  );
}
