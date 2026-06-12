import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

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

/** ダークラグジュアリー背景：漆黒のグラデ + 下方からのゴールド放射グロー（リファレンス準拠） */
export function DarkLuxBg({ id = 'darkLux' }: { id?: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}_b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1C1710" />
          <Stop offset="1" stopColor="#0A0805" />
        </LinearGradient>
        {/* 下方からのゴールド放射グロー（強め） */}
        <RadialGradient id={`${id}_g`} cx="50%" cy="82%" r="75%">
          <Stop offset="0" stopColor="#E0B85E" stopOpacity="0.5" />
          <Stop offset="0.5" stopColor="#C9A24A" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#C9A24A" stopOpacity="0" />
        </RadialGradient>
        {/* ギフト章の後光ハロー */}
        <RadialGradient id={`${id}_halo`} cx="50%" cy="24%" r="42%">
          <Stop offset="0" stopColor="#F0D070" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#F0D070" stopOpacity="0" />
        </RadialGradient>
        {/* 斜めのメタリック金ライトストリーク（光の筋） */}
        <LinearGradient id={`${id}_streak`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0.28" stopColor="#EBC871" stopOpacity="0" />
          <Stop offset="0.36" stopColor="#F2DC8C" stopOpacity="0.22" />
          <Stop offset="0.42" stopColor="#EBC871" stopOpacity="0" />
          <Stop offset="0.60" stopColor="#EBC871" stopOpacity="0" />
          <Stop offset="0.67" stopColor="#F2DC8C" stopOpacity="0.16" />
          <Stop offset="0.73" stopColor="#EBC871" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${id}_b)`} />
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${id}_streak)`} />
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${id}_halo)`} />
      <Rect x="0" y="0" width="100%" height={2000} fill={`url(#${id}_g)`} />
    </Svg>
  );
}

/**
 * ライトラグジュアリー背景：クリスプな白地 + ゴールドの放射グロー（ハロー）。
 * DarkLuxBg の反転版。白×ゴールドの上質感を出す。
 */
export function LightLuxBg({ id = 'lightLux' }: { id?: string }) {
  // viewBox 0..100 + preserveAspectRatio="none" で実寸に正しくマッピング。
  // 放射グラデは cx=50（中央）で左右対称＝帯やムラが出ない。
  // ダークと同じ「上=後光ハロー / 下=ゴールドグロー」を明るい地に再現。
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={`${id}_b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFDF6" />
          <Stop offset="1" stopColor="#F6ECCF" />
        </LinearGradient>
        <RadialGradient id={`${id}_halo`} cx="50" cy="20" r="42" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F0D070" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#F0D070" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`${id}_g`} cx="50" cy="94" r="58" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#E0B85E" stopOpacity="0.42" />
          <Stop offset="0.55" stopColor="#D4A855" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#D4A855" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}_b)`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}_halo)`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}_g)`} />
    </Svg>
  );
}
