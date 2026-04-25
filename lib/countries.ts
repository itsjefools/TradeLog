// ISO 3166-1 alpha-2 国コード + 日本語表記
// 全世界の主要国を網羅。flag は国コードから自動生成可能。

export type Country = {
  code: string; // ISO alpha-2 (例: 'JP')
  name: string; // 日本語名
  nameEn: string; // 英語名
};

export const COUNTRIES: Country[] = [
  { code: 'JP', name: '日本', nameEn: 'Japan' },
  { code: 'US', name: 'アメリカ合衆国', nameEn: 'United States' },
  { code: 'GB', name: 'イギリス', nameEn: 'United Kingdom' },
  { code: 'CA', name: 'カナダ', nameEn: 'Canada' },
  { code: 'AU', name: 'オーストラリア', nameEn: 'Australia' },
  { code: 'NZ', name: 'ニュージーランド', nameEn: 'New Zealand' },
  { code: 'DE', name: 'ドイツ', nameEn: 'Germany' },
  { code: 'FR', name: 'フランス', nameEn: 'France' },
  { code: 'IT', name: 'イタリア', nameEn: 'Italy' },
  { code: 'ES', name: 'スペイン', nameEn: 'Spain' },
  { code: 'PT', name: 'ポルトガル', nameEn: 'Portugal' },
  { code: 'NL', name: 'オランダ', nameEn: 'Netherlands' },
  { code: 'BE', name: 'ベルギー', nameEn: 'Belgium' },
  { code: 'CH', name: 'スイス', nameEn: 'Switzerland' },
  { code: 'AT', name: 'オーストリア', nameEn: 'Austria' },
  { code: 'IE', name: 'アイルランド', nameEn: 'Ireland' },
  { code: 'SE', name: 'スウェーデン', nameEn: 'Sweden' },
  { code: 'NO', name: 'ノルウェー', nameEn: 'Norway' },
  { code: 'DK', name: 'デンマーク', nameEn: 'Denmark' },
  { code: 'FI', name: 'フィンランド', nameEn: 'Finland' },
  { code: 'PL', name: 'ポーランド', nameEn: 'Poland' },
  { code: 'CZ', name: 'チェコ', nameEn: 'Czech Republic' },
  { code: 'HU', name: 'ハンガリー', nameEn: 'Hungary' },
  { code: 'GR', name: 'ギリシャ', nameEn: 'Greece' },
  { code: 'TR', name: 'トルコ', nameEn: 'Turkey' },
  { code: 'RU', name: 'ロシア', nameEn: 'Russia' },
  { code: 'UA', name: 'ウクライナ', nameEn: 'Ukraine' },
  { code: 'CN', name: '中国', nameEn: 'China' },
  { code: 'KR', name: '韓国', nameEn: 'South Korea' },
  { code: 'TW', name: '台湾', nameEn: 'Taiwan' },
  { code: 'HK', name: '香港', nameEn: 'Hong Kong' },
  { code: 'SG', name: 'シンガポール', nameEn: 'Singapore' },
  { code: 'MY', name: 'マレーシア', nameEn: 'Malaysia' },
  { code: 'TH', name: 'タイ', nameEn: 'Thailand' },
  { code: 'VN', name: 'ベトナム', nameEn: 'Vietnam' },
  { code: 'PH', name: 'フィリピン', nameEn: 'Philippines' },
  { code: 'ID', name: 'インドネシア', nameEn: 'Indonesia' },
  { code: 'IN', name: 'インド', nameEn: 'India' },
  { code: 'PK', name: 'パキスタン', nameEn: 'Pakistan' },
  { code: 'BD', name: 'バングラデシュ', nameEn: 'Bangladesh' },
  { code: 'AE', name: 'アラブ首長国連邦', nameEn: 'United Arab Emirates' },
  { code: 'SA', name: 'サウジアラビア', nameEn: 'Saudi Arabia' },
  { code: 'IL', name: 'イスラエル', nameEn: 'Israel' },
  { code: 'EG', name: 'エジプト', nameEn: 'Egypt' },
  { code: 'ZA', name: '南アフリカ', nameEn: 'South Africa' },
  { code: 'NG', name: 'ナイジェリア', nameEn: 'Nigeria' },
  { code: 'KE', name: 'ケニア', nameEn: 'Kenya' },
  { code: 'MA', name: 'モロッコ', nameEn: 'Morocco' },
  { code: 'BR', name: 'ブラジル', nameEn: 'Brazil' },
  { code: 'AR', name: 'アルゼンチン', nameEn: 'Argentina' },
  { code: 'MX', name: 'メキシコ', nameEn: 'Mexico' },
  { code: 'CL', name: 'チリ', nameEn: 'Chile' },
  { code: 'CO', name: 'コロンビア', nameEn: 'Colombia' },
  { code: 'PE', name: 'ペルー', nameEn: 'Peru' },
  { code: 'VE', name: 'ベネズエラ', nameEn: 'Venezuela' },
];

// 国コードを国旗絵文字に変換
// 例: 'JP' → 🇯🇵
// 各文字を Regional Indicator Symbol（U+1F1E6 〜 U+1F1FF）にマップする
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  const a = upper.charCodeAt(0);
  const b = upper.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return '';
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(a + offset, b + offset);
}

export function findCountry(code: string | null | undefined): Country | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null;
}
