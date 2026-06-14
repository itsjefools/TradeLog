import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * 明るいシャンパン→ゴールドのメタリックグラデーション背景（絶対配置の塗り）。
 * 親に borderRadius + overflow:'hidden' を付けて使う。Rect を十分大きい固定高にして
 * react-native-svg の「%高さが動的な親に追従しない」不具合を回避し、どんな高さの
 * 親でも確実に全面を覆う。
 */
export const GOLD_GRAD_STOPS = {
  light: '#FBE7A4',
  mid: '#F0D584',
  deep: '#D8B24A',
} as const;

/**
 * メタリックなゴールドグラデ + 斜めのシーン（光の反射帯）で“輝き”を出す。
 * base レイヤーの上に、ほぼ白のハイライト帯を重ねて金属光沢を演出する。
 */
export function GoldGradient({
  id = 'goldGrad',
  diagonal = true,
}: {
  id?: string;
  diagonal?: boolean;
}) {
  const baseId = `${id}_base`;
  const sheenId = `${id}_sheen`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={baseId} x1="0" y1="0" x2={diagonal ? '1' : '0'} y2="1">
          <Stop offset="0" stopColor="#E6C25E" />
          <Stop offset="0.5" stopColor="#CDA53C" />
          <Stop offset="1" stopColor="#AD8829" />
        </LinearGradient>
        {/* 斜めの白いハイライト帯（反射） */}
        <LinearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0.32" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.48" stopColor="#FFF3CE" stopOpacity="0.5" />
          <Stop offset="0.52" stopColor="#FFF3CE" stopOpacity="0.5" />
          <Stop offset="0.68" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${baseId})`} />
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${sheenId})`} />
    </Svg>
  );
}

type Stops = { offset: string; color: string }[];

/**
 * 動的高の親でも確実に全面を塗る縦リニアグラデ背景。
 * react-native-svg は「%指定の Rect 高さが動的高の親に追従しない」不具合があり、
 * 覆い漏れた右・下に親 View の単色背景が透けて“逆L字”ムラになる。対策として
 * onLayout で実寸を測り、Svg/Rect に数値で渡す（viewBox も % も使わない）。
 * リニアは objectBoundingBox(0..1) の縦方向のみ＝左右対称でムラ・帯が出ない。
 */
function LuxBg({ id, stops }: { id: string; stops: Stops }) {
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
            <LinearGradient id={`${id}_b`} x1="0" y1="0" x2="0" y2="1">
              {stops.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id}_b)`} />
        </Svg>
      )}
    </View>
  );
}

/** ダークラグジュアリー背景：上=暖色グロー帯 / 下=漆黒（縦リニアのみ）。 */
export function DarkLuxBg({ id = 'darkLux' }: { id?: string }) {
  return (
    <LuxBg
      id={id}
      stops={[
        { offset: '0', color: '#15110A' },
        { offset: '0.32', color: '#2E2611' },
        { offset: '0.66', color: '#1A1409' },
        { offset: '1', color: '#100C06' },
      ]}
    />
  );
}

/** ライトラグジュアリー背景：白に近い地→暖色クリーム（縦リニアのみ）。 */
export function LightLuxBg({ id = 'lightLux' }: { id?: string }) {
  return (
    <LuxBg
      id={id}
      stops={[
        { offset: '0', color: '#FFFDF7' },
        { offset: '0.45', color: '#FAF1D6' },
        { offset: '1', color: '#F1E2BA' },
      ]}
    />
  );
}
