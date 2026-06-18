import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// カバー画像が無いコミュニティのバナー背景。
// ブランド（インディゴ / エメラルド / シャンパン）× オニキスのダークグラデで高級感を出す。
// 名前から決め打ちで配色を選ぶので、コミュニティごとに表情が変わりつつブランド内に収まる。
const VARIANTS = [
  { a: '#3B357A', mid: '#21223A', b: '#101116' }, // インディゴ
  { a: '#0F5C4E', mid: '#16302C', b: '#101116' }, // エメラルド
  { a: '#5C4A1F', mid: '#2A2616', b: '#101116' }, // シャンパンゴールド
  { a: '#2E3A66', mid: '#1B2030', b: '#101116' }, // スレートブルー
] as const;

function variantFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return VARIANTS[h % VARIANTS.length];
}

export function CommunityBannerBg({ name }: { name: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const v = variantFor(name);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => {
        const w = Math.ceil(e.nativeEvent.layout.width);
        const h = Math.ceil(e.nativeEvent.layout.height);
        setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <Svg width={size.w} height={size.h} pointerEvents="none">
          <Defs>
            {/* 斜めのブランド→オニキス */}
            <LinearGradient id="cbg_base" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={v.a} />
              <Stop offset="0.55" stopColor={v.mid} />
              <Stop offset="1" stopColor={v.b} />
            </LinearGradient>
            {/* 上からの薄い光沢（ガラス質の高級感） */}
            <LinearGradient id="cbg_sheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.10" />
              <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#cbg_base)" />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#cbg_sheen)" />
        </Svg>
      )}
    </View>
  );
}
