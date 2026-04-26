// FX/トレード用語集

export type GlossaryTerm = {
  term: string;
  reading?: string; // ふりがな・別表記（検索ヒット用）
  category: 'basic' | 'order' | 'analysis' | 'risk' | 'psychology';
  definition: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'pip',
    reading: 'ピップ',
    category: 'basic',
    definition:
      '通貨ペアの価格変動の最小単位。USD/JPY なら 0.01円 = 1pip、EUR/USD なら 0.0001 = 1pip。',
  },
  {
    term: 'ロット',
    reading: 'lot',
    category: 'basic',
    definition:
      '取引数量の単位。1ロット = 10万通貨が国際標準。0.1ロット = 1万通貨（ミニロット）、0.01ロット = 1千通貨（マイクロロット）。',
  },
  {
    term: 'スプレッド',
    reading: 'spread',
    category: 'basic',
    definition: '売値（Bid）と買値（Ask）の差。実質的な取引コスト。',
  },
  {
    term: 'ロング',
    reading: 'long 買い',
    category: 'basic',
    definition: '買いポジション。価格上昇で利益が出る。',
  },
  {
    term: 'ショート',
    reading: 'short 売り',
    category: 'basic',
    definition:
      '売りポジション。価格下落で利益が出る。FXは持ってない通貨を売って後で買い戻すことができる。',
  },
  {
    term: 'スキャルピング',
    reading: 'scalping',
    category: 'basic',
    definition: '数秒〜数分の超短期売買。小さな値動きで素早く利益を狙う手法。',
  },
  {
    term: 'デイトレード',
    reading: 'day trading',
    category: 'basic',
    definition: 'その日のうちにポジションを閉じる短期売買。日跨ぎはしない。',
  },
  {
    term: 'スイングトレード',
    reading: 'swing trading',
    category: 'basic',
    definition: '数日〜数週間の中期売買。大きなトレンドを狙う。',
  },
  {
    term: '指値注文',
    reading: 'limit order さしねちゅうもん',
    category: 'order',
    definition: '指定した価格で売買する注文。今より有利な価格で約定させたいときに使う。',
  },
  {
    term: '逆指値注文',
    reading: 'stop order ぎゃくさしね',
    category: 'order',
    definition:
      '指定した価格になったら成行で発注する注文。損切り（ストップロス）に使う。',
  },
  {
    term: 'OCO',
    reading: 'one cancels other',
    category: 'order',
    definition:
      '利確と損切りの2つを同時に出す注文。片方が約定するともう片方は自動キャンセル。',
  },
  {
    term: 'IFD',
    reading: 'if done',
    category: 'order',
    definition:
      '新規注文と決済注文を同時に出す。新規が約定したら決済注文が有効になる。',
  },
  {
    term: 'IFDOCO',
    reading: 'ifdoco',
    category: 'order',
    definition:
      'IFDとOCOを組合せ。新規約定後、利確と損切りの両方を自動セット。',
  },
  {
    term: 'ローソク足',
    reading: 'candlestick',
    category: 'analysis',
    definition:
      '4本値（始値・高値・安値・終値）を1本で表示するチャート。実体とヒゲで値動きを可視化。',
  },
  {
    term: '移動平均線',
    reading: 'moving average ma',
    category: 'analysis',
    definition:
      '一定期間の価格の平均をつなげた線。トレンドの方向を確認するのに使う。',
  },
  {
    term: 'RSI',
    reading: 'relative strength index',
    category: 'analysis',
    definition:
      '相対力指数。0〜100で買われすぎ/売られすぎを示す。70以上で買われすぎ、30以下で売られすぎ。',
  },
  {
    term: 'MACD',
    reading: 'macd マックディー',
    category: 'analysis',
    definition: 'トレンド転換を捉える指標。短期と長期の移動平均の差で判断。',
  },
  {
    term: 'サポート',
    reading: 'support line 支持線',
    category: 'analysis',
    definition: '価格が下げ止まりやすい水準。買いの目安に使う。',
  },
  {
    term: 'レジスタンス',
    reading: 'resistance 抵抗線',
    category: 'analysis',
    definition: '価格が上げ止まりやすい水準。売りの目安に使う。',
  },
  {
    term: 'ブレイク',
    reading: 'break',
    category: 'analysis',
    definition:
      'サポートやレジスタンスを抜けること。トレンド発生のサインとされる。',
  },
  {
    term: 'リスクリワード',
    reading: 'risk reward rr',
    category: 'risk',
    definition:
      '想定利益÷想定損失の比率。RR比 2:1 なら、損切り幅の2倍を利確目標に置くという意味。',
  },
  {
    term: 'ストップロス',
    reading: 'stop loss 損切り',
    category: 'risk',
    definition:
      '損失を限定するための注文。事前に決めておくことが資金管理の基本。',
  },
  {
    term: 'テイクプロフィット',
    reading: 'take profit 利確',
    category: 'risk',
    definition: '利益を確定する注文。目標に達したら欲張らずに利確。',
  },
  {
    term: '証拠金維持率',
    reading: 'margin level',
    category: 'risk',
    definition:
      '純資産÷必要証拠金×100。低くなるとロスカットされる。一般的に100%を切ると追証/強制決済の対象。',
  },
  {
    term: 'ロスカット',
    reading: 'loss cut',
    category: 'risk',
    definition:
      '証拠金維持率が一定を下回ると業者が強制的にポジションを閉じる仕組み。',
  },
  {
    term: 'レバレッジ',
    reading: 'leverage',
    category: 'risk',
    definition:
      '少額の証拠金で大きな取引ができる仕組み。日本国内は最大25倍。利益も損失も増幅される。',
  },
  {
    term: 'ドローダウン',
    reading: 'drawdown',
    category: 'risk',
    definition:
      '資産が一時的に減った量。最大ドローダウンは戦略の安全度を測る指標。',
  },
  {
    term: 'プロスペクト理論',
    reading: 'prospect theory',
    category: 'psychology',
    definition:
      '人は利益より損失を強く感じる。FX で損切りできず塩漬けにする原因。',
  },
  {
    term: 'ポジポジ病',
    reading: 'overtrading',
    category: 'psychology',
    definition:
      '常にポジションを持っていないと落ち着かない状態。負けの大きな原因。',
  },
  {
    term: 'リベンジトレード',
    reading: 'revenge trade',
    category: 'psychology',
    definition: '損失を取り返そうと無理なトレードを重ねること。さらに損を拡大しがち。',
  },
];

export const GLOSSARY_CATEGORIES: Record<
  GlossaryTerm['category'],
  string
> = {
  basic: '基本',
  order: '注文',
  analysis: 'テクニカル',
  risk: 'リスク管理',
  psychology: 'メンタル',
};
