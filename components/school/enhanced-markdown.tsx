import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { ThemeColors } from '@/constants/theme';

// ============================================================================
// InfoBox 設定 (tip / warning / key / example)
// ============================================================================

type BoxKind = 'tip' | 'warning' | 'key' | 'example';

const BOX_STYLES: Record<
  BoxKind,
  { light: BoxStyle; dark: BoxStyle }
> = {
  tip: {
    light: { bg: '#EFF6FF', border: '#3B82F6', icon: '💡', label: 'TIP' },
    dark: { bg: 'rgba(59,130,246,0.10)', border: '#3B82F6', icon: '💡', label: 'TIP' },
  },
  warning: {
    light: { bg: '#FFF7ED', border: '#F59E0B', icon: '⚠️', label: 'WARNING' },
    dark: { bg: 'rgba(245,158,11,0.10)', border: '#F59E0B', icon: '⚠️', label: 'WARNING' },
  },
  key: {
    light: { bg: '#F0FDF4', border: '#10B981', icon: '🔑', label: 'KEY CONCEPT' },
    dark: { bg: 'rgba(16,185,129,0.10)', border: '#10B981', icon: '🔑', label: 'KEY CONCEPT' },
  },
  example: {
    light: { bg: '#F5F3FF', border: '#8B5CF6', icon: '📌', label: 'EXAMPLE' },
    dark: { bg: 'rgba(139,92,246,0.10)', border: '#8B5CF6', icon: '📌', label: 'EXAMPLE' },
  },
};

type BoxStyle = {
  bg: string;
  border: string;
  icon: string;
  label: string;
};

function InfoBox({
  type,
  text,
  c,
  isDark,
}: {
  type: BoxKind;
  text: string;
  c: ThemeColors;
  isDark: boolean;
}) {
  const style = BOX_STYLES[type][isDark ? 'dark' : 'light'];
  return (
    <View
      style={{
        backgroundColor: style.bg,
        borderLeftWidth: 3,
        borderLeftColor: style.border,
        borderRadius: 8,
        padding: 16,
        marginVertical: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 14, marginRight: 6 }}>{style.icon}</Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: style.border,
            letterSpacing: 1.2,
          }}
        >
          {style.label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          color: c.textPrimary,
          lineHeight: 22,
          letterSpacing: 0.1,
        }}
      >
        {renderInlineString(text)}
      </Text>
    </View>
  );
}

// ============================================================================
// インライン装飾 (バッククォート ハイライト + **太字**)
// ============================================================================

function renderInlineString(text: string): ReactNode {
  // **bold** をまず処理
  if (text.includes('**')) {
    const parts = text.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <Text key={i} style={{ fontWeight: '600' }}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    );
  }
  return text;
}

function renderHighlighted(
  text: string,
  baseStyle: TextStyle,
  c: ThemeColors,
  isDark: boolean,
): ReactNode {
  const parts = text.split(/(`[^`]+`)/);
  if (parts.length === 1 && !text.includes('**')) {
    return <Text style={baseStyle}>{text}</Text>;
  }

  const highlightBg = isDark ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.10)';
  const highlightFg = isDark ? '#6EE7B7' : '#047857';

  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const inner = part.slice(1, -1);
          return (
            <Text
              key={i}
              style={{
                backgroundColor: highlightBg,
                color: highlightFg,
                fontWeight: '600',
              }}
            >
              {' '}
              {inner}{' '}
            </Text>
          );
        }
        if (part.includes('**')) {
          const boldParts = part.split(/\*\*(.*?)\*\*/);
          return boldParts.map((bp, j) =>
            j % 2 === 1 ? (
              <Text key={`${i}-${j}`} style={{ fontWeight: '600' }}>
                {bp}
              </Text>
            ) : (
              <Text key={`${i}-${j}`}>{bp}</Text>
            ),
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ============================================================================
// SVG 図解
// ============================================================================

const GREEN = '#10B981';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const AMBER = '#F59E0B';

function diagramColors(isDark: boolean) {
  return {
    text: isDark ? '#E5E7EB' : '#374151',
    sub: isDark ? '#9CA3AF' : '#6B7280',
    line: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
    softLine: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    softBg: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
    boxBg: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
    boxBorder: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
    highlightBg: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
  };
}

function CandlestickDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={260} viewBox="0 0 300 260">
        <G>
          <Line x1="80" y1="30" x2="80" y2="70" stroke={GREEN} strokeWidth="2" />
          <Rect x="60" y="70" width="40" height="80" fill={GREEN} rx="3" />
          <Line x1="80" y1="150" x2="80" y2="200" stroke={GREEN} strokeWidth="2" />
          <SvgText x="80" y="20" textAnchor="middle" fontSize="12" fontWeight="600" fill={GREEN}>
            陽線
          </SvgText>
          <Line x1="105" y1="30" x2="140" y2="30" stroke={colors.line} strokeWidth="1" strokeDasharray="3,3" />
          <SvgText x="144" y="34" fontSize="10" fill={colors.sub}>高値 (High)</SvgText>
          <Line x1="105" y1="70" x2="140" y2="55" stroke={colors.line} strokeWidth="1" strokeDasharray="3,3" />
          <SvgText x="144" y="59" fontSize="10" fill={colors.sub}>終値 (Close)</SvgText>
          <Line x1="105" y1="150" x2="140" y2="165" stroke={colors.line} strokeWidth="1" strokeDasharray="3,3" />
          <SvgText x="144" y="169" fontSize="10" fill={colors.sub}>始値 (Open)</SvgText>
          <Line x1="105" y1="200" x2="140" y2="195" stroke={colors.line} strokeWidth="1" strokeDasharray="3,3" />
          <SvgText x="144" y="199" fontSize="10" fill={colors.sub}>安値 (Low)</SvgText>
        </G>
        <G>
          <Line x1="220" y1="30" x2="220" y2="70" stroke={RED} strokeWidth="2" />
          <Rect x="200" y="70" width="40" height="80" fill={RED} rx="3" />
          <Line x1="220" y1="150" x2="220" y2="200" stroke={RED} strokeWidth="2" />
          <SvgText x="220" y="20" textAnchor="middle" fontSize="12" fontWeight="600" fill={RED}>
            陰線
          </SvgText>
        </G>
        <SvgText x="80" y="230" textAnchor="middle" fontSize="10" fill={colors.sub}>
          終値 {'>'} 始値
        </SvgText>
        <SvgText x="220" y="230" textAnchor="middle" fontSize="10" fill={colors.sub}>
          終値 {'<'} 始値
        </SvgText>
        <SvgText x="80" y="115" textAnchor="middle" fontSize="10" fontWeight="600" fill="#FFFFFF">
          実体
        </SvgText>
        <SvgText x="220" y="115" textAnchor="middle" fontSize="10" fontWeight="600" fill="#FFFFFF">
          実体
        </SvgText>
      </Svg>
    </View>
  );
}

function CurrencyFlowDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={200} viewBox="0 0 300 200">
        <Rect x="20" y="60" width="80" height="50" rx="8" fill={colors.boxBg} stroke={colors.boxBorder} strokeWidth="1" />
        <SvgText x="60" y="82" textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.text}>USD</SvgText>
        <SvgText x="60" y="100" textAnchor="middle" fontSize="10" fill={colors.sub}>基軸通貨</SvgText>

        <SvgText x="120" y="92" textAnchor="middle" fontSize="20" fontWeight="300" fill={colors.sub}>/</SvgText>

        <Rect x="140" y="60" width="80" height="50" rx="8" fill={colors.boxBg} stroke={colors.boxBorder} strokeWidth="1" />
        <SvgText x="180" y="82" textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.text}>JPY</SvgText>
        <SvgText x="180" y="100" textAnchor="middle" fontSize="10" fill={colors.sub}>決済通貨</SvgText>

        <SvgText x="235" y="92" textAnchor="middle" fontSize="16" fontWeight="300" fill={colors.sub}>=</SvgText>
        <SvgText x="270" y="92" textAnchor="middle" fontSize="16" fontWeight="700" fill={BLUE}>150.00</SvgText>

        <Path d="M 60 130 L 60 160 L 180 160 L 180 130" stroke={GREEN} strokeWidth="1.5" fill="none" strokeDasharray="4,3" />
        <SvgText x="120" y="155" textAnchor="middle" fontSize="10" fontWeight="600" fill={GREEN}>買い(ロング)</SvgText>
        <SvgText x="120" y="175" textAnchor="middle" fontSize="9" fill={colors.sub}>USDを買い → JPYを売る</SvgText>

        <Path d="M 180 50 L 180 25 L 60 25 L 60 50" stroke={RED} strokeWidth="1.5" fill="none" strokeDasharray="4,3" />
        <SvgText x="120" y="22" textAnchor="middle" fontSize="10" fontWeight="600" fill={RED}>売り(ショート)</SvgText>
        <SvgText x="120" y="10" textAnchor="middle" fontSize="9" fill={colors.sub}>USDを売り → JPYを買う</SvgText>
      </Svg>
    </View>
  );
}

function PipCalculationDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={180} viewBox="0 0 300 180">
        <SvgText x="150" y="20" textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.sub}>
          EUR/USD
        </SvgText>

        <SvgText x="45" y="55" textAnchor="middle" fontSize="28" fontWeight="300" fill={colors.text}>1</SvgText>
        <SvgText x="65" y="55" textAnchor="middle" fontSize="28" fontWeight="300" fill={colors.text}>.</SvgText>
        <SvgText x="85" y="55" textAnchor="middle" fontSize="28" fontWeight="300" fill={colors.text}>0</SvgText>
        <SvgText x="110" y="55" textAnchor="middle" fontSize="28" fontWeight="300" fill={colors.text}>8</SvgText>
        <SvgText x="135" y="55" textAnchor="middle" fontSize="28" fontWeight="300" fill={colors.text}>5</SvgText>

        <Rect x="146" y="30" width="28" height="34" rx="6" fill={colors.highlightBg} />
        <SvgText x="160" y="55" textAnchor="middle" fontSize="28" fontWeight="700" fill={BLUE}>0</SvgText>

        <Line x1="160" y1="68" x2="160" y2="85" stroke={BLUE} strokeWidth="1.5" />
        <SvgText x="160" y="100" textAnchor="middle" fontSize="12" fontWeight="600" fill={BLUE}>← 1 pip</SvgText>
        <SvgText x="160" y="115" textAnchor="middle" fontSize="10" fill={colors.sub}>小数点以下第4位</SvgText>

        <Line x1="20" y1="135" x2="280" y2="135" stroke={colors.softLine} strokeWidth="0.5" />

        <SvgText x="75" y="155" textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.sub}>
          USD/JPY
        </SvgText>
        <SvgText x="150" y="155" textAnchor="middle" fontSize="14" fontWeight="300" fill={colors.text}>
          150.
        </SvgText>
        <Rect x="170" y="141" width="22" height="20" rx="4" fill={colors.highlightBg} />
        <SvgText x="181" y="156" textAnchor="middle" fontSize="14" fontWeight="700" fill={BLUE}>00</SvgText>
        <SvgText x="230" y="155" textAnchor="middle" fontSize="10" fill={colors.sub}>第2位 = 1 pip</SvgText>
      </Svg>
    </View>
  );
}

function OrderTypesDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={240} viewBox="0 0 300 240">
        <Line x1="40" y1="20" x2="40" y2="220" stroke={colors.line} strokeWidth="1" />

        <Line x1="40" y1="120" x2="280" y2="120" stroke={colors.text} strokeWidth="1.5" strokeDasharray="6,4" />
        <Rect x="100" y="108" width="100" height="24" rx="6" fill={BLUE} />
        <SvgText x="150" y="124" textAnchor="middle" fontSize="11" fontWeight="600" fill="#FFFFFF">
          現在価格 150.00
        </SvgText>

        <Line x1="40" y1="170" x2="200" y2="170" stroke={GREEN} strokeWidth="1" strokeDasharray="3,3" />
        <Circle cx="210" cy="170" r="5" fill={GREEN} />
        <SvgText x="224" y="167" fontSize="10" fontWeight="600" fill={GREEN}>Buy Limit</SvgText>
        <SvgText x="224" y="180" fontSize="9" fill={colors.sub}>149.50 で指値買い</SvgText>

        <Line x1="40" y1="70" x2="200" y2="70" stroke={RED} strokeWidth="1" strokeDasharray="3,3" />
        <Circle cx="210" cy="70" r="5" fill={RED} />
        <SvgText x="224" y="67" fontSize="10" fontWeight="600" fill={RED}>Sell Limit</SvgText>
        <SvgText x="224" y="80" fontSize="9" fill={colors.sub}>150.50 で指値売り</SvgText>

        <Line x1="40" y1="200" x2="200" y2="200" stroke={AMBER} strokeWidth="1.5" />
        <SvgText x="224" y="197" fontSize="10" fontWeight="600" fill={AMBER}>Stop Loss</SvgText>
        <SvgText x="224" y="210" fontSize="9" fill={colors.sub}>149.30 で損切り</SvgText>

        <Line x1="40" y1="40" x2="200" y2="40" stroke={GREEN} strokeWidth="1.5" />
        <SvgText x="224" y="37" fontSize="10" fontWeight="600" fill={GREEN}>Take Profit</SvgText>
        <SvgText x="224" y="50" fontSize="9" fill={colors.sub}>151.00 で利確</SvgText>

        <SvgText x="20" y="44" textAnchor="middle" fontSize="8" fill={colors.sub}>151.00</SvgText>
        <SvgText x="20" y="74" textAnchor="middle" fontSize="8" fill={colors.sub}>150.50</SvgText>
        <SvgText x="20" y="124" textAnchor="middle" fontSize="8" fill={colors.sub}>150.00</SvgText>
        <SvgText x="20" y="174" textAnchor="middle" fontSize="8" fill={colors.sub}>149.50</SvgText>
        <SvgText x="20" y="204" textAnchor="middle" fontSize="8" fill={colors.sub}>149.30</SvgText>
      </Svg>
    </View>
  );
}

function SpreadDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={140} viewBox="0 0 300 140">
        <Rect x="20" y="40" width="120" height="40" rx="6" fill={BLUE} opacity="0.15" />
        <Rect x="20" y="40" width="120" height="40" rx="6" stroke={BLUE} strokeWidth="1" fill="none" />
        <SvgText x="80" y="55" textAnchor="middle" fontSize="10" fontWeight="500" fill={BLUE}>売値 (Bid)</SvgText>
        <SvgText x="80" y="72" textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.text}>150.00</SvgText>

        <Rect x="160" y="40" width="120" height="40" rx="6" fill={RED} opacity="0.15" />
        <Rect x="160" y="40" width="120" height="40" rx="6" stroke={RED} strokeWidth="1" fill="none" />
        <SvgText x="220" y="55" textAnchor="middle" fontSize="10" fontWeight="500" fill={RED}>買値 (Ask)</SvgText>
        <SvgText x="220" y="72" textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.text}>150.03</SvgText>

        <Line x1="140" y1="60" x2="160" y2="60" stroke={colors.sub} strokeWidth="1" strokeDasharray="2,2" />
        <Path d="M 80 90 L 80 105 L 220 105 L 220 90" stroke={colors.sub} strokeWidth="1" fill="none" />
        <SvgText x="150" y="120" textAnchor="middle" fontSize="12" fontWeight="700" fill={colors.text}>
          スプレッド = 3 pips
        </SvgText>
        <SvgText x="150" y="135" textAnchor="middle" fontSize="10" fill={colors.sub}>
          これがあなたの取引コスト
        </SvgText>

        <SvgText x="150" y="20" textAnchor="middle" fontSize="12" fontWeight="600" fill={colors.sub}>
          USD/JPY スプレッドの仕組み
        </SvgText>
      </Svg>
    </View>
  );
}

function SupportResistanceDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={200} viewBox="0 0 300 200">
        <Rect x="20" y="34" width="260" height="20" rx="4" fill={RED} opacity="0.08" />
        <Line x1="20" y1="44" x2="280" y2="44" stroke={RED} strokeWidth="1.5" strokeDasharray="6,3" />
        <SvgText x="280" y="30" textAnchor="end" fontSize="10" fontWeight="600" fill={RED}>レジスタンス</SvgText>

        <Rect x="20" y="150" width="260" height="20" rx="4" fill={GREEN} opacity="0.08" />
        <Line x1="20" y1="160" x2="280" y2="160" stroke={GREEN} strokeWidth="1.5" strokeDasharray="6,3" />
        <SvgText x="280" y="186" textAnchor="end" fontSize="10" fontWeight="600" fill={GREEN}>サポート</SvgText>

        <Path
          d="M 30 100 L 60 55 L 85 90 L 110 50 L 135 85 L 155 45 L 175 95 L 200 55 L 220 150 L 240 95 L 260 155 L 275 110"
          stroke={BLUE}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />

        <Circle cx="110" cy="50" r="4" fill={RED} opacity="0.6" />
        <Circle cx="155" cy="45" r="4" fill={RED} opacity="0.6" />
        <Circle cx="220" cy="150" r="4" fill={GREEN} opacity="0.6" />
        <Circle cx="260" cy="155" r="4" fill={GREEN} opacity="0.6" />

        <SvgText x="150" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.sub}>
          サポート＆レジスタンスの概念
        </SvgText>

        <SvgText x="110" y="75" textAnchor="middle" fontSize="9" fill={RED}>反落↓</SvgText>
        <SvgText x="240" y="140" textAnchor="middle" fontSize="9" fill={GREEN}>反発↑</SvgText>
      </Svg>
    </View>
  );
}

function LotSizeDiagram({ isDark }: { isDark: boolean }) {
  const colors = diagramColors(isDark);
  return (
    <View style={diagramWrap}>
      <Svg width={300} height={160} viewBox="0 0 300 160">
        <SvgText x="150" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.sub}>
          ロットサイズ比較
        </SvgText>

        <Rect x="20" y="30" width="260" height="28" rx="6" fill={BLUE} opacity="0.25" />
        <Rect x="20" y="30" width="260" height="28" rx="6" stroke={BLUE} strokeWidth="1" fill="none" />
        <SvgText x="150" y="48" textAnchor="middle" fontSize="11" fontWeight="600" fill={colors.text}>
          1 ロット = 100,000通貨 → 1pipあたり ≈ ¥1,000
        </SvgText>

        <Rect x="20" y="70" width="130" height="28" rx="6" fill={BLUE} opacity="0.15" />
        <Rect x="20" y="70" width="130" height="28" rx="6" stroke={BLUE} strokeWidth="1" fill="none" />
        <SvgText x="85" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill={colors.text}>
          0.1 ロット → ≈ ¥100/pip
        </SvgText>

        <Rect x="20" y="110" width="52" height="28" rx="6" fill={BLUE} opacity="0.08" />
        <Rect x="20" y="110" width="52" height="28" rx="6" stroke={BLUE} strokeWidth="1" fill="none" />
        <SvgText x="46" y="128" textAnchor="middle" fontSize="9" fontWeight="600" fill={colors.text}>0.01</SvgText>
        <SvgText x="90" y="128" fontSize="10" fill={colors.sub}>→ ≈ ¥10/pip（初心者推奨）</SvgText>
      </Svg>
    </View>
  );
}

const diagramWrap = {
  marginVertical: 16,
  alignItems: 'center' as const,
};

function DiagramBlock({
  name,
  isDark,
}: {
  name: string;
  isDark: boolean;
}) {
  switch (name) {
    case 'candlestick':
      return <CandlestickDiagram isDark={isDark} />;
    case 'currency_flow':
      return <CurrencyFlowDiagram isDark={isDark} />;
    case 'pip_calculation':
      return <PipCalculationDiagram isDark={isDark} />;
    case 'order_types':
      return <OrderTypesDiagram isDark={isDark} />;
    case 'spread':
      return <SpreadDiagram isDark={isDark} />;
    case 'support_resistance':
      return <SupportResistanceDiagram isDark={isDark} />;
    case 'lot_size':
      return <LotSizeDiagram isDark={isDark} />;
    default:
      return null;
  }
}

// ============================================================================
// メイン EnhancedMarkdown
// ============================================================================

type Props = {
  text: string;
  c: ThemeColors;
  isDark: boolean;
};

export function EnhancedMarkdown({ text, c, isDark }: Props) {
  const styles = useMemo(() => makeStyles(c), [c]);
  if (!text) return null;

  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let blockType: BoxKind | null = null;
  let blockContent: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <View key={`list-${key++}`} style={styles.listBlock}>
        {listItems.map((item, i) => (
          <View key={i} style={styles.listRow}>
            <Text style={styles.listBullet}>•</Text>
            {renderHighlighted(item, styles.listText, c, isDark)}
          </View>
        ))}
      </View>,
    );
    listItems = [];
  };

  const flushBlock = () => {
    if (!blockType) return;
    const body = blockContent.join('\n').trim();
    if (body) {
      elements.push(
        <InfoBox
          key={`box-${key++}`}
          type={blockType}
          text={body}
          c={c}
          isDark={isDark}
        />,
      );
    }
    blockType = null;
    blockContent = [];
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine;
    const trimmed = line.trim();

    // ブロック終了
    if (trimmed === ':::' && blockType) {
      flushBlock();
      return;
    }

    // ブロック内: そのまま蓄積
    if (blockType) {
      blockContent.push(line);
      return;
    }

    // 図解 (:::diagram:name:::)
    const diagram = trimmed.match(/^:::diagram:(\w+):::$/);
    if (diagram) {
      flushList();
      elements.push(
        <DiagramBlock key={`d-${i}`} name={diagram[1]} isDark={isDark} />,
      );
      return;
    }

    // インフォボックス開始 (:::tip / :::warning / :::key / :::example)
    const blockStart = trimmed.match(/^:::(tip|warning|key|example)$/);
    if (blockStart) {
      flushList();
      blockType = blockStart[1] as BoxKind;
      blockContent = [];
      return;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <Text key={`h3-${i}`} style={styles.h3}>
          {line.slice(4)}
        </Text>,
      );
      return;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <Text
          key={`h2-${i}`}
          style={[styles.h2, i > 0 && styles.h2Spaced]}
        >
          {line.slice(3)}
        </Text>,
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList();
      // レッスンタイトルはヘッダーで表示済みなのでスキップ
      return;
    }

    // 番号付きリスト
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (numbered) {
      flushList();
      elements.push(
        <View key={`num-${i}`} style={styles.listRow}>
          <Text style={styles.numBullet}>{numbered[1]}.</Text>
          {renderHighlighted(numbered[2], styles.listText, c, isDark)}
        </View>,
      );
      return;
    }

    // 箇条書き
    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();

    if (trimmed === '') {
      elements.push(<View key={`sp-${i}`} style={styles.spacer} />);
      return;
    }

    // 通常段落 (バッククォート + 太字)
    elements.push(
      <View key={`p-${i}`} style={styles.paragraphWrap}>
        {renderHighlighted(line, styles.paragraph, c, isDark)}
      </View>,
    );
  });

  flushList();
  flushBlock();

  return <View>{elements}</View>;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    h2: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 14,
      letterSpacing: -0.3,
    },
    h2Spaced: { marginTop: 36 },
    h3: {
      fontSize: 17,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 24,
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    paragraphWrap: { marginBottom: 4 },
    paragraph: {
      fontSize: 16,
      color: c.textPrimary,
      lineHeight: 28,
      letterSpacing: 0.1,
    },
    spacer: { height: 12 },
    listBlock: { marginBottom: 20 },
    listRow: {
      flexDirection: 'row',
      marginBottom: 10,
      paddingLeft: 4,
    },
    listBullet: {
      fontSize: 16,
      color: c.textSecondary,
      marginRight: 12,
      lineHeight: 26,
    },
    numBullet: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
      width: 24,
      lineHeight: 26,
    },
    listText: {
      flex: 1,
      fontSize: 16,
      color: c.textPrimary,
      lineHeight: 26,
      letterSpacing: 0.1,
    },
  });
}
