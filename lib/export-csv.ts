import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Trade } from './types';

const COLUMNS = [
  'traded_at',
  'currency_pair',
  'direction',
  'result',
  'entry_price',
  'exit_price',
  'lot_size',
  'pnl',
  'pnl_pips',
  'memo',
  'post_memo',
  'review_memo',
  'is_shared',
] as const;

type Col = (typeof COLUMNS)[number];

const HEADERS: Record<string, Record<Col, string>> = {
  ja: {
    traded_at: '取引日時',
    currency_pair: '通貨ペア',
    direction: '方向',
    result: '結果',
    entry_price: 'エントリー価格',
    exit_price: 'エグジット価格',
    lot_size: 'ロット数',
    pnl: '損益',
    pnl_pips: '損益(pips)',
    memo: 'エントリー前メモ',
    post_memo: 'エグジット後メモ',
    review_memo: '振り返り',
    is_shared: 'フィード共有',
  },
  en: {
    traded_at: 'Date',
    currency_pair: 'Pair',
    direction: 'Direction',
    result: 'Result',
    entry_price: 'Entry Price',
    exit_price: 'Exit Price',
    lot_size: 'Lot',
    pnl: 'P&L',
    pnl_pips: 'P&L (Pips)',
    memo: 'Pre-Entry Note',
    post_memo: 'Post-Exit Note',
    review_memo: 'Review',
    is_shared: 'Shared',
  },
  pt: {
    traded_at: 'Data',
    currency_pair: 'Par',
    direction: 'Direção',
    result: 'Resultado',
    entry_price: 'Preço de Entrada',
    exit_price: 'Preço de Saída',
    lot_size: 'Lote',
    pnl: 'P&L',
    pnl_pips: 'P&L (Pips)',
    memo: 'Nota Pré-Entrada',
    post_memo: 'Nota Pós-Saída',
    review_memo: 'Revisão',
    is_shared: 'Compartilhado',
  },
  es: {
    traded_at: 'Fecha',
    currency_pair: 'Par',
    direction: 'Dirección',
    result: 'Resultado',
    entry_price: 'Precio de Entrada',
    exit_price: 'Precio de Salida',
    lot_size: 'Lote',
    pnl: 'P&L',
    pnl_pips: 'P&L (Pips)',
    memo: 'Nota Pre-Entrada',
    post_memo: 'Nota Post-Salida',
    review_memo: 'Revisión',
    is_shared: 'Compartido',
  },
};

const DIALOG_TITLE: Record<string, string> = {
  ja: '取引データをエクスポート',
  en: 'Export trade data',
  pt: 'Exportar dados de operações',
  es: 'Exportar datos de operaciones',
};

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // RFC 4180: quote if contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function tradeToRow(t: Trade): string {
  return COLUMNS.map((col) => {
    const v = t[col];
    if (col === 'is_shared') return v ? '1' : '0';
    return escapeCell(v);
  }).join(',');
}

export function buildTradesCsv(trades: Trade[], locale = 'ja'): string {
  const headerMap = HEADERS[locale] ?? HEADERS.en;
  const header = COLUMNS.map((c) => escapeCell(headerMap[c])).join(',');
  const rows = trades.map(tradeToRow);
  // BOM 付き UTF-8 で Excel が文字化けしないように
  return '﻿' + [header, ...rows].join('\r\n');
}

export async function exportTradesCsv(
  trades: Trade[],
  locale = 'ja',
): Promise<void> {
  if (trades.length === 0) {
    throw new Error('エクスポートする取引がありません');
  }

  const csv = buildTradesCsv(trades, locale);
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const filename = `tradelog-${yyyy}${mm}${dd}.csv`;
  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csv);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('共有機能が利用できません');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: DIALOG_TITLE[locale] ?? DIALOG_TITLE.en,
    UTI: 'public.comma-separated-values-text',
  });
}
