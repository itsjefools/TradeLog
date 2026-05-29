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
  // --- basic（基礎用語） ---
  {
    term: 'ベース通貨',
    reading: 'base currency きじゅんつうか',
    category: 'basic',
    definition:
      '通貨ペアの左側に表示される通貨。USD/JPY ならUSDがベース通貨で、1USDあたりの円価格を示す。',
  },
  {
    term: '決済通貨',
    reading: 'quote currency クオート通貨',
    category: 'basic',
    definition:
      '通貨ペアの右側に表示される通貨。USD/JPY ならJPYが決済通貨で、価格はこの通貨建てで表示される。',
  },
  {
    term: 'クロス円',
    reading: 'cross yen',
    category: 'basic',
    definition:
      '米ドル以外の通貨と日本円の組合せ。EUR/JPY、GBP/JPY、AUD/JPY など。値動きが大きく日本人トレーダーに人気。',
  },
  {
    term: 'クロス通貨',
    reading: 'cross currency',
    category: 'basic',
    definition:
      '米ドルを介さない通貨ペア全般。EUR/GBP、EUR/AUD、GBP/JPY など。ドルストレートに比べてスプレッドが広めの傾向。',
  },
  {
    term: 'ドルストレート',
    reading: 'dollar straight',
    category: 'basic',
    definition:
      '米ドルが絡む通貨ペアのうちUSD/JPYを除いたもの。EUR/USD、GBP/USD、AUD/USD など。流動性が高くスプレッドが狭い。',
  },
  {
    term: 'メジャー通貨',
    reading: 'major currency',
    category: 'basic',
    definition:
      '取引量が多く流動性の高い主要通貨。USD、EUR、JPY、GBP、CHF、CAD、AUD、NZD の8通貨が代表的。',
  },
  {
    term: 'マイナー通貨',
    reading: 'minor currency',
    category: 'basic',
    definition:
      'メジャー通貨ほど取引量はないが一定の流動性を持つ通貨。NOK、SEK、SGD、HKD など。',
  },
  {
    term: 'エキゾチック通貨',
    reading: 'exotic currency 新興国通貨',
    category: 'basic',
    definition:
      '新興国の通貨。TRY（トルコリラ）、ZAR（南アフリカランド）、MXN（メキシコペソ）など。高金利だが値動きが激しくスプレッドも広い。',
  },
  {
    term: 'ティック',
    reading: 'tick',
    category: 'basic',
    definition:
      '価格が動く最小単位、または1回の値動きそのもの。ティックチャートは時間ではなくティック数で1本のローソク足を作る。',
  },
  {
    term: '約定',
    reading: 'execution やくじょう',
    category: 'basic',
    definition:
      '注文が成立して売買が確定すること。約定価格と注文価格にズレ（スリッページ）が生じる場合がある。',
  },
  {
    term: '出来高',
    reading: 'volume できだか',
    category: 'basic',
    definition:
      '一定期間に成立した取引量。FXは相対取引のため正確な総出来高は把握しづらく、業者ごとの数値や先物の出来高で代用する。',
  },
  {
    term: '流動性',
    reading: 'liquidity りゅうどうせい',
    category: 'basic',
    definition:
      '市場で売買が成立しやすい度合い。流動性が高いとスプレッドが狭く約定が安定。深夜や祝日は流動性が低下しやすい。',
  },
  {
    term: 'スワップポイント',
    reading: 'swap point',
    category: 'basic',
    definition:
      '2通貨の金利差から生じる調整額。高金利通貨を買えば受取り、売れば支払い。日跨ぎで毎日発生する。',
  },
  {
    term: 'スリッページ',
    reading: 'slippage',
    category: 'basic',
    definition:
      '注文価格と実際の約定価格のズレ。指標発表時など相場が急変すると拡大しやすい。',
  },
  {
    term: 'ハイレバ',
    reading: 'high leverage',
    category: 'basic',
    definition:
      '高いレバレッジをかけた取引。日本国内は最大25倍だが、海外業者では数百倍も可能。リスクも比例して増える。',
  },
  {
    term: '両建て',
    reading: 'りょうだて hedge',
    category: 'basic',
    definition:
      '同じ通貨ペアで買いと売りを同時に持つこと。スワップ差で実質コストが発生し、業者によっては禁止。',
  },
  {
    term: '強制決済',
    reading: 'forced liquidation',
    category: 'basic',
    definition:
      '証拠金が一定水準を下回ると業者が自動的にポジションを閉じる仕組み。日本ではロスカットとほぼ同義で使われる。',
  },
  {
    term: 'ノーポジ',
    reading: 'no position',
    category: 'basic',
    definition:
      'ポジションを一切持っていない状態。判断が難しい相場や週末持ち越しを避けたいときに選択される。',
  },
  {
    term: 'OTC市場',
    reading: 'over the counter 相対取引',
    category: 'basic',
    definition:
      '取引所を介さず当事者間で直接取引する市場。FX は基本的にOTCで、業者がレートを提示する相対取引。',
  },
  {
    term: 'インターバンク市場',
    reading: 'interbank market',
    category: 'basic',
    definition:
      '世界の銀行同士が直接取引する市場。FX 業者はこの市場のレートを参照して顧客に提示する。',
  },
  {
    term: 'ボラティリティ',
    reading: 'volatility',
    category: 'basic',
    definition:
      '価格変動の大きさ。ボラが高いほど利益機会も損失リスクも大きい。ATR などで定量化できる。',
  },
  {
    term: 'pips',
    reading: 'ピップス',
    category: 'basic',
    definition:
      'pip の複数形。値動きを「20pips 取れた」のように表現する。1pip の値は通貨ペアごとに異なる。',
  },
  // --- order（注文・約定） ---
  {
    term: '成行注文',
    reading: 'market order なりゆきちゅうもん',
    category: 'order',
    definition:
      '現在の市場価格で即座に約定させる注文。確実に約定するが、スリッページが発生する場合がある。',
  },
  {
    term: 'OCO注文',
    reading: 'one cancels other',
    category: 'order',
    definition:
      '2つの注文を同時に出し、片方が約定するともう片方が自動キャンセルされる注文。利確と損切りの同時セットに使う。',
  },
  {
    term: 'IFD注文',
    reading: 'if done',
    category: 'order',
    definition:
      '新規注文と決済注文をセットで発注し、新規約定後に決済注文が有効になる仕組み。',
  },
  {
    term: 'IFO注文',
    reading: 'ifo if done oco',
    category: 'order',
    definition:
      'IFD と OCO を組合せた注文。新規約定後に利確と損切りの両方が自動でセットされ、片方が約定するともう片方はキャンセル。',
  },
  {
    term: 'トレーリングストップ',
    reading: 'trailing stop',
    category: 'order',
    definition:
      '価格が有利な方向に動くと逆指値も自動で追随する注文。含み益を伸ばしつつ反転時の利益確定を狙える。',
  },
  {
    term: '約定拒否',
    reading: 'rejection',
    category: 'order',
    definition:
      '業者側がレート急変などを理由に注文を成立させないこと。指標発表前後に起こりやすい。',
  },
  {
    term: 'リクオート',
    reading: 'requote',
    category: 'order',
    definition:
      '注文時に提示価格が変わって再提示されること。受け入れるか取消すかをトレーダーが選ぶ。',
  },
  {
    term: 'パーシャル約定',
    reading: 'partial fill 部分約定',
    category: 'order',
    definition:
      '注文数量の一部だけが約定し、残りが約定しない状態。流動性が薄い場面で発生しやすい。',
  },
  {
    term: 'エントリー',
    reading: 'entry',
    category: 'order',
    definition:
      '新規にポジションを建てること。エントリー基準を明確にすることが勝率の安定につながる。',
  },
  {
    term: 'エグジット',
    reading: 'exit 決済',
    category: 'order',
    definition:
      'ポジションを閉じること。利確・損切りいずれも含む。エントリー以上に重要とされる。',
  },
  {
    term: 'ナンピン',
    reading: 'averaging down 難平',
    category: 'order',
    definition:
      '含み損のあるポジションと同方向に追加発注して平均取得単価を下げる手法。資金管理を誤ると致命傷になりやすい。',
  },
  {
    term: 'ピラミッディング',
    reading: 'pyramiding',
    category: 'order',
    definition:
      '含み益が乗っているポジションに同方向で買い増しする手法。トレンドフォローと相性が良いが反転リスクも増える。',
  },
  {
    term: 'ドテン',
    reading: 'reverse position',
    category: 'order',
    definition:
      '保有ポジションを決済すると同時に反対方向で新規エントリーすること。明確なトレンド転換時に使う。',
  },
  {
    term: '寄り付き',
    reading: 'opening よりつき',
    category: 'order',
    definition:
      '市場が開いた直後の取引、またはその価格。週明け月曜の寄付きは窓開けが発生することがある。',
  },
  {
    term: '引け',
    reading: 'closing ひけ',
    category: 'order',
    definition:
      '市場が閉まる直前の取引や終値。NY 5時の引けは日次のスワップ計算基準時刻でもある。',
  },
  // --- analysis（テクニカル/ファンダ） ---
  {
    term: '指数移動平均線',
    reading: 'ema exponential moving average',
    category: 'analysis',
    definition:
      '直近の価格に重みをつけた移動平均。単純移動平均（SMA）より反応が早く、トレンド転換の検知に向く。',
  },
  {
    term: 'ボリンジャーバンド',
    reading: 'bollinger bands',
    category: 'analysis',
    definition:
      '移動平均線と標準偏差で作るバンド。±2σ内に約95%の価格が収まる統計性質を利用し、反発や拡張を判断する。',
  },
  {
    term: 'ストキャスティクス',
    reading: 'stochastics',
    category: 'analysis',
    definition:
      '一定期間の高値・安値に対する現在値の位置を示すオシレーター。80以上で買われすぎ、20以下で売られすぎとされる。',
  },
  {
    term: '一目均衡表',
    reading: 'ichimoku いちもく',
    category: 'analysis',
    definition:
      '日本発祥のテクニカル指標。転換線・基準線・先行スパン・遅行スパンと雲で時間と価格の両面から相場を分析する。',
  },
  {
    term: '雲',
    reading: 'kumo cloud',
    category: 'analysis',
    definition:
      '一目均衡表の先行スパン1と2に囲まれた領域。厚い雲は強いサポート/レジスタンスとして機能する。',
  },
  {
    term: '三役好転',
    reading: 'three roles bullish',
    category: 'analysis',
    definition:
      '一目均衡表で「転換線>基準線」「価格>雲」「遅行スパン>価格」の3条件が揃った強気サイン。逆は三役逆転。',
  },
  {
    term: 'ダウ理論',
    reading: 'dow theory',
    category: 'analysis',
    definition:
      'チャールズ・ダウが提唱したトレンド分析の基礎。高値・安値が共に切り上がれば上昇トレンド継続と判断する。',
  },
  {
    term: 'エリオット波動',
    reading: 'elliott wave',
    category: 'analysis',
    definition:
      '相場は5つの推進波と3つの修正波で構成されるという理論。波のカウントで現在位置と次の動きを予測する。',
  },
  {
    term: 'フィボナッチリトレースメント',
    reading: 'fibonacci retracement',
    category: 'analysis',
    definition:
      'トレンドの押し戻しを23.6%、38.2%、50%、61.8% などの比率で予測する手法。押し目買い・戻り売りの目安に使う。',
  },
  {
    term: 'フィボナッチエクステンション',
    reading: 'fibonacci extension',
    category: 'analysis',
    definition:
      'フィボナッチ比率を用いて利確目標を算出する手法。代表的な水準は127.2%、161.8%、261.8%。',
  },
  {
    term: 'トレンドライン',
    reading: 'trend line',
    category: 'analysis',
    definition:
      '安値同士または高値同士を結んだ斜めの線。トレンドの方向と勢いを視覚的に把握する基本ツール。',
  },
  {
    term: 'チャネル',
    reading: 'channel',
    category: 'analysis',
    definition:
      'トレンドラインと平行に引いたもう1本の線で挟まれた価格帯。上下限での反発を狙うレンジ戦略に使う。',
  },
  {
    term: 'ダブルトップ',
    reading: 'double top',
    category: 'analysis',
    definition:
      '高値圏で2つの山を形成する反転パターン。ネックライン割れで下落サインとされる。',
  },
  {
    term: 'ダブルボトム',
    reading: 'double bottom',
    category: 'analysis',
    definition:
      '安値圏で2つの谷を形成する反転パターン。ネックライン抜けで上昇サインとされる。',
  },
  {
    term: 'ヘッドアンドショルダー',
    reading: 'head and shoulders 三尊',
    category: 'analysis',
    definition:
      '3つの山のうち真ん中が最も高い反転パターン。日本では三尊とも呼ばれ、強い下落転換サイン。',
  },
  {
    term: '逆ヘッドアンドショルダー',
    reading: 'inverse head and shoulders 逆三尊',
    category: 'analysis',
    definition:
      'ヘッドアンドショルダーを上下反転した底値パターン。ネックライン抜けで上昇トレンド転換のサイン。',
  },
  {
    term: 'トリプルトップ',
    reading: 'triple top',
    category: 'analysis',
    definition:
      '高値圏で3つの山を作る反転パターン。ダブルトップより信頼性が高いとされる。',
  },
  {
    term: 'フラッグ',
    reading: 'flag',
    category: 'analysis',
    definition:
      '急騰・急落後に出現する平行四辺形の保ち合いパターン。元のトレンド方向への継続を示唆する。',
  },
  {
    term: 'ペナント',
    reading: 'pennant',
    category: 'analysis',
    definition:
      '急騰・急落後に出現する三角形の保ち合いパターン。フラッグ同様トレンド継続のサインとされる。',
  },
  {
    term: 'トライアングル',
    reading: 'triangle 三角保ち合い',
    category: 'analysis',
    definition:
      '値幅が収束していく三角形のパターン。上昇・下降・対称の3種類があり、ブレイク方向にトレンドが発生しやすい。',
  },
  {
    term: 'ピボットポイント',
    reading: 'pivot point',
    category: 'analysis',
    definition:
      '前日の高値・安値・終値から算出する当日の節目価格。S1〜S3、R1〜R3 をサポート・レジスタンスとして使う。',
  },
  {
    term: 'ATR',
    reading: 'average true range 平均真の値幅',
    category: 'analysis',
    definition:
      '一定期間の値幅の平均でボラティリティを測る指標。損切り幅やポジションサイズの目安に使われる。',
  },
  {
    term: 'ADX',
    reading: 'average directional index',
    category: 'analysis',
    definition:
      'トレンドの強さを0〜100で示す指標。25を超えると明確なトレンド、20以下はレンジ相場と判断されることが多い。',
  },
  {
    term: 'パラボリックSAR',
    reading: 'parabolic sar',
    category: 'analysis',
    definition:
      '価格の上下に表示されるドットでトレンド方向と転換点を示す指標。ドットを抜けると転換サイン。',
  },
  {
    term: 'FOMC',
    reading: 'federal open market committee',
    category: 'analysis',
    definition:
      '米連邦公開市場委員会。年8回の会合で米国の政策金利を決定し、ドル相場や世界の株価に大きな影響を与える。',
  },
  {
    term: 'ECB',
    reading: 'european central bank 欧州中央銀行',
    category: 'analysis',
    definition:
      'ユーロ圏の中央銀行。金融政策決定会合と総裁会見でユーロ相場が大きく動く。',
  },
  {
    term: 'BOJ',
    reading: 'bank of japan 日本銀行',
    category: 'analysis',
    definition:
      '日本の中央銀行。金融政策決定会合や総裁会見が円相場の主要な変動要因となる。',
  },
  {
    term: 'CPI',
    reading: 'consumer price index 消費者物価指数',
    category: 'analysis',
    definition:
      '消費者物価指数。インフレ動向を示す主要指標で、中央銀行の金融政策見通しに直結する重要指標。',
  },
  {
    term: 'GDP',
    reading: 'gross domestic product 国内総生産',
    category: 'analysis',
    definition:
      '一国の経済規模を表す指標。速報値・改定値・確報値の3段階で発表され、予想とのズレで相場が動く。',
  },
  {
    term: '雇用統計',
    reading: 'nfp non farm payrolls',
    category: 'analysis',
    definition:
      '米国の非農業部門雇用者数。毎月第1金曜日に発表され、FX相場の最重要指標の1つ。失業率と平均時給も同時発表。',
  },
  {
    term: 'PMI',
    reading: 'purchasing managers index 購買担当者景気指数',
    category: 'analysis',
    definition:
      '製造業・サービス業の景況感を示す指数。50を上回ると景気拡大、下回ると後退を示唆する。',
  },
  {
    term: '政策金利',
    reading: 'policy rate',
    category: 'analysis',
    definition:
      '中央銀行が定める基準金利。引上げは通常その通貨高、引下げは通貨安につながりやすい。',
  },
  {
    term: 'タカ派',
    reading: 'hawkish ホーキッシュ',
    category: 'analysis',
    definition:
      '景気よりインフレ抑制を重視し、利上げや金融引締めを支持する姿勢。タカ派発言はその通貨高要因。',
  },
  {
    term: 'ハト派',
    reading: 'dovish ダビッシュ',
    category: 'analysis',
    definition:
      'インフレより景気・雇用を重視し、利下げや金融緩和を支持する姿勢。ハト派発言はその通貨安要因。',
  },
  {
    term: 'リスクオン',
    reading: 'risk on',
    category: 'analysis',
    definition:
      '投資家がリスクを取りに行く相場環境。株高・高金利通貨買い・安全通貨売りが進みやすい。',
  },
  {
    term: 'リスクオフ',
    reading: 'risk off',
    category: 'analysis',
    definition:
      '投資家がリスクを避ける相場環境。株安・円買い・スイスフラン買い・金買いが起こりやすい。',
  },
  // --- risk（リスク管理） ---
  {
    term: '2%ルール',
    reading: 'two percent rule',
    category: 'risk',
    definition:
      '1トレードの最大許容損失を口座資金の2%以内に抑える資金管理ルール。連敗しても口座が大きく毀損しない設計。',
  },
  {
    term: '最大ドローダウン',
    reading: 'max drawdown',
    category: 'risk',
    definition:
      '資産曲線の最高値から最安値までの最大下落幅。戦略の耐久性を測る代表的な指標。',
  },
  {
    term: '期待値',
    reading: 'expected value',
    category: 'risk',
    definition:
      '勝率×平均利益 − 負け率×平均損失で算出。プラスであれば長期的に資産が増える優位性のあるトレード手法といえる。',
  },
  {
    term: 'ケリー基準',
    reading: 'kelly criterion',
    category: 'risk',
    definition:
      '長期的な資産成長率を最大化する最適ベットサイズを算出する公式。実運用ではブレが大きいため半分以下の保守運用が一般的。',
  },
  {
    term: '必要証拠金',
    reading: 'required margin',
    category: 'risk',
    definition:
      'ポジションを建てるために必要な担保額。取引額 ÷ レバレッジで概算でき、レバレッジが高いほど少額で済む。',
  },
  {
    term: '追証',
    reading: 'margin call おいしょう',
    category: 'risk',
    definition:
      '証拠金維持率が一定を下回った際に追加入金を求められる制度。期限内に対応しないと強制決済となる。',
  },
  {
    term: 'ポジションサイジング',
    reading: 'position sizing',
    category: 'risk',
    definition:
      '1回のトレードで何ロット建てるかを決める設計。許容損失額と損切り幅から逆算するのが基本。',
  },
  {
    term: '通貨相関',
    reading: 'currency correlation',
    category: 'risk',
    definition:
      '通貨ペア同士の値動きの連動度合い。EUR/USD と GBP/USD のように相関が高いペアを同方向に持つと実質的にリスクが倍化する。',
  },
  {
    term: 'ヘッジ',
    reading: 'hedge',
    category: 'risk',
    definition:
      '保有ポジションのリスクを相殺する反対売買や別商品でのカバー。為替変動の影響を抑える目的で使う。',
  },
  {
    term: 'インプライドボラティリティ',
    reading: 'implied volatility iv',
    category: 'risk',
    definition:
      'オプション価格から逆算した将来のボラティリティ予想。上昇は市場が大きな値動きを見込んでいることを示す。',
  },
  {
    term: 'VaR',
    reading: 'value at risk',
    category: 'risk',
    definition:
      '一定期間・一定確率で発生し得る最大損失額の推計値。機関投資家のリスク管理で広く使われる指標。',
  },
  {
    term: 'シャープレシオ',
    reading: 'sharpe ratio',
    category: 'risk',
    definition:
      '超過リターン ÷ リターンの標準偏差で算出。リスクあたりの効率を測る代表指標で、1を超えると優秀とされる。',
  },
  {
    term: '勝率',
    reading: 'win rate しょうりつ',
    category: 'risk',
    definition:
      '全トレード数に対する勝ちトレード数の割合。勝率だけでは優位性は判定できず、リスクリワードと組合せて評価する。',
  },
  // --- psychology（心理） ---
  {
    term: '確証バイアス',
    reading: 'confirmation bias',
    category: 'psychology',
    definition:
      '自分の仮説に都合の良い情報ばかり集めてしまう認知の偏り。エントリー後に反対サインを無視する原因になる。',
  },
  {
    term: 'FOMO',
    reading: 'fear of missing out',
    category: 'psychology',
    definition:
      '機会損失への恐怖から飛び乗りエントリーしてしまう心理。急騰直後の高値掴みの典型的な原因。',
  },
  {
    term: 'ティルト',
    reading: 'tilt',
    category: 'psychology',
    definition:
      '連敗や大きな損失で冷静さを失った精神状態。判断が雑になり損失を拡大しやすい。一度離席するのが鉄則。',
  },
  {
    term: 'ルール遵守',
    reading: 'rule discipline',
    category: 'psychology',
    definition:
      '自分で決めた売買ルールを例外なく実行すること。長期的な勝ち組と負け組を分ける最大の要因とされる。',
  },
  {
    term: 'トレード日誌',
    reading: 'trading journal',
    category: 'psychology',
    definition:
      'エントリー根拠・結果・反省を記録する日誌。感情と判断を可視化することで再現性ある手法を作るための土台になる。',
  },
  {
    term: '損失回避',
    reading: 'loss aversion',
    category: 'psychology',
    definition:
      '同じ金額でも利益より損失を強く感じる心理傾向。早すぎる利確・遅すぎる損切りの根本原因の1つ。',
  },
  {
    term: 'オーバートレード',
    reading: 'overtrading',
    category: 'psychology',
    definition:
      '必要以上に取引回数や枚数を増やしてしまう状態。手数料負け・判断ミスを連発する典型的な失敗パターン。',
  },
  {
    term: 'パニック決済',
    reading: 'panic close',
    category: 'psychology',
    definition:
      '急な値動きに動揺して計画外に手仕舞いすること。底値・天井で投げる原因となり後悔しやすい。',
  },
  {
    term: 'アンカリング',
    reading: 'anchoring',
    category: 'psychology',
    definition:
      '最初に見た価格などを基準として過度に依存する心理。エントリー価格に固執して損切りが遅れる原因になる。',
  },
  {
    term: '過信',
    reading: 'overconfidence',
    category: 'psychology',
    definition:
      '連勝後に「自分は外さない」と感じてしまうバイアス。ロットを過剰に上げて大損する典型ルート。',
  },
  {
    term: 'メタ認知',
    reading: 'metacognition',
    category: 'psychology',
    definition:
      '自分の思考や感情を客観的に観察する力。「今焦っているな」と気付けるとティルトを早期に抜けられる。',
  },
  {
    term: '自己効力感',
    reading: 'self efficacy',
    category: 'psychology',
    definition:
      '「自分はうまくやれる」という感覚。小さな成功体験の積み重ねで育ち、ルール遵守の継続力につながる。',
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
