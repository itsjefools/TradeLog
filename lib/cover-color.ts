// 文字列から決定的に「高級感のある」色を選ぶ。表紙/ロゴのプレースホルダ用。
const PALETTE = [
  '#1E293B', // slate
  '#3730A3', // indigo
  '#0F766E', // teal
  '#7C2D12', // brown
  '#581C87', // purple
  '#155E75', // cyan
  '#9F1239', // rose
  '#1E3A8A', // blue
  '#3F6212', // lime-dark
  '#7E22CE', // violet
];

export function colorFromString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}
