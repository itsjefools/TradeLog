// 経済指標カレンダーの静的データ
// 主要な定例イベントのみ。日付は各国中銀・統計局の公表予定に基づく目安。
// 本番運用では外部API（Forex Factory / Investing.com / TradingEconomics）連携を推奨。

export type Importance = 'high' | 'medium' | 'low';

export type EconomicEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (JST) - 任意
  country: string;
  flag: string; // 国旗絵文字
  name: string;
  importance: Importance;
  description?: string;
};

// 2026年の主要イベント（目安）
export const ECONOMIC_EVENTS: EconomicEvent[] = [
  // 4月
  { id: 'us-fomc-202604', date: '2026-04-29', time: '03:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合', importance: 'high', description: '米連邦公開市場委員会。政策金利の決定発表。' },
  { id: 'jp-boj-202604', date: '2026-04-30', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合 + 展望レポート', importance: 'high', description: '日本銀行の政策金利+経済物価情勢の展望。' },

  // 5月
  { id: 'us-nfp-202605', date: '2026-05-01', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（4月分）', importance: 'high', description: '非農業部門雇用者数・失業率・平均時給。' },
  { id: 'us-cpi-202605', date: '2026-05-13', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（4月分）', importance: 'high', description: '消費者物価指数。インフレ動向の主要指標。' },
  { id: 'eu-ecb-202605', date: '2026-05-14', time: '20:45', country: 'EU', flag: '🇪🇺', name: 'ECB理事会（議事要旨）', importance: 'medium' },
  { id: 'us-pce-202605', date: '2026-05-29', time: '21:30', country: 'US', flag: '🇺🇸', name: '米PCEデフレーター', importance: 'high', description: 'FRBが重視するインフレ指標。' },

  // 6月
  { id: 'us-nfp-202606', date: '2026-06-05', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（5月分）', importance: 'high' },
  { id: 'eu-ecb-202606', date: '2026-06-04', time: '20:45', country: 'EU', flag: '🇪🇺', name: 'ECB理事会', importance: 'high' },
  { id: 'us-cpi-202606', date: '2026-06-10', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（5月分）', importance: 'high' },
  { id: 'us-fomc-202606', date: '2026-06-17', time: '03:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合（SEP発表）', importance: 'high', description: '経済予測サマリー（ドットプロット）含む。' },
  { id: 'jp-boj-202606', date: '2026-06-19', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合', importance: 'high' },

  // 7月
  { id: 'us-nfp-202607', date: '2026-07-03', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（6月分）', importance: 'high' },
  { id: 'us-cpi-202607', date: '2026-07-15', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（6月分）', importance: 'high' },
  { id: 'eu-ecb-202607', date: '2026-07-23', time: '20:45', country: 'EU', flag: '🇪🇺', name: 'ECB理事会', importance: 'high' },
  { id: 'us-fomc-202607', date: '2026-07-29', time: '03:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合', importance: 'high' },
  { id: 'jp-boj-202607', date: '2026-07-31', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合 + 展望レポート', importance: 'high' },

  // 8月
  { id: 'us-nfp-202608', date: '2026-08-07', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（7月分）', importance: 'high' },
  { id: 'us-cpi-202608', date: '2026-08-12', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（7月分）', importance: 'high' },
  { id: 'us-jacksonhole-202608', date: '2026-08-27', country: 'US', flag: '🇺🇸', name: 'ジャクソンホール会議', importance: 'high', description: '主要中銀総裁が集まる年次経済シンポジウム。' },

  // 9月
  { id: 'us-nfp-202609', date: '2026-09-04', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（8月分）', importance: 'high' },
  { id: 'eu-ecb-202609', date: '2026-09-10', time: '20:45', country: 'EU', flag: '🇪🇺', name: 'ECB理事会', importance: 'high' },
  { id: 'us-cpi-202609', date: '2026-09-15', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（8月分）', importance: 'high' },
  { id: 'us-fomc-202609', date: '2026-09-16', time: '03:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合（SEP発表）', importance: 'high' },
  { id: 'jp-boj-202609', date: '2026-09-18', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合', importance: 'high' },

  // 10月
  { id: 'us-nfp-202610', date: '2026-10-02', time: '21:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（9月分）', importance: 'high' },
  { id: 'us-cpi-202610', date: '2026-10-13', time: '21:30', country: 'US', flag: '🇺🇸', name: '米CPI（9月分）', importance: 'high' },
  { id: 'eu-ecb-202610', date: '2026-10-29', time: '20:45', country: 'EU', flag: '🇪🇺', name: 'ECB理事会', importance: 'high' },
  { id: 'jp-boj-202610', date: '2026-10-30', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合 + 展望レポート', importance: 'high' },
  { id: 'us-fomc-202610', date: '2026-10-29', time: '03:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合', importance: 'high' },

  // 11月
  { id: 'us-nfp-202611', date: '2026-11-06', time: '22:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（10月分）', importance: 'high' },
  { id: 'us-cpi-202611', date: '2026-11-12', time: '22:30', country: 'US', flag: '🇺🇸', name: '米CPI（10月分）', importance: 'high' },

  // 12月
  { id: 'us-nfp-202612', date: '2026-12-04', time: '22:30', country: 'US', flag: '🇺🇸', name: '米雇用統計（11月分）', importance: 'high' },
  { id: 'eu-ecb-202612', date: '2026-12-10', time: '22:15', country: 'EU', flag: '🇪🇺', name: 'ECB理事会', importance: 'high' },
  { id: 'us-cpi-202612', date: '2026-12-10', time: '22:30', country: 'US', flag: '🇺🇸', name: '米CPI（11月分）', importance: 'high' },
  { id: 'us-fomc-202612', date: '2026-12-16', time: '04:00', country: 'US', flag: '🇺🇸', name: 'FOMC会合（SEP発表）', importance: 'high' },
  { id: 'jp-boj-202612', date: '2026-12-18', country: 'JP', flag: '🇯🇵', name: '日銀金融政策決定会合', importance: 'high' },
];

export function importanceColor(imp: Importance): string {
  return imp === 'high' ? '#EF4444' : imp === 'medium' ? '#F59E0B' : '#9CA3AF';
}

export function importanceLabel(imp: Importance): string {
  return imp === 'high' ? '高' : imp === 'medium' ? '中' : '低';
}
