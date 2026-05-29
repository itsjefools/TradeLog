-- TradeLog: Insert 6 advanced Technical Analysis lessons inspired by
-- John J. Murphy's "Technical Analysis of the Financial Markets".
--
-- Topics: Dow Theory, Elliott Wave Basics, Fibonacci Retracements & Extensions,
-- Moving Average Crossovers, RSI & Stochastic Oscillators, MACD.
--
-- All four language columns (ja / en / pt / es) are populated using dollar-quoted
-- strings ($ja$ ... $ja$ etc.) so the markdown bodies can contain any characters
-- without escaping. Lessons attach to the existing "Technical Analysis" category,
-- use difficulty = 'advanced', is_free = false, sort_order 100-105, and
-- duration_minutes 8-15.
--
-- Idempotent: each insert is guarded by `where not exists (... title_en ...)`,
-- so re-running this migration is safe.
--
-- Note: No `:::diagram:NAME:::` blocks are used since none of the existing
-- diagram names cover these advanced topics. Content uses the standard
-- :::tip / :::warning / :::key / :::example info blocks.

-- ============================================================================
-- 1. Dow Theory  (sort_order 100)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'ダウ理論', 'Dow Theory', 'Teoria de Dow', 'Teoría de Dow',
  'advanced', false, 100, 10,
  $ja$ダウ理論は近代テクニカル分析の出発点です。チャールズ・ダウが100年以上前に提唱したこの理論は、現代のFXトレードにもそのまま当てはまります。

:::key
ダウ理論の核心は「市場はすべてを織り込む」「トレンドには3つの段階と3つの規模がある」「トレンドは転換が確認されるまで継続する」という3点です。
:::

## ダウ理論の6つの基本原則

1. **市場価格はすべての情報を織り込む** — ファンダメンタルズ、心理、ニュース、すべてが価格に反映されている
2. **トレンドには3つの規模がある** — 主要トレンド、二次トレンド、小トレンド
3. **主要トレンドは3つの段階を持つ** — 蓄積期、追随期、利食い期
4. **平均は相互に確認し合う必要がある** — 関連する市場・指数が同じ方向を示すべき
5. **トレンドは出来高で確認される** — トレンド方向に出来高が増えるのが健全
6. **トレンドは明確な転換シグナルが出るまで継続する**

## 3つのトレンド規模

**主要トレンド（Primary）** — 1年以上続く大きな方向。日足・週足で確認します。

**二次トレンド（Secondary）** — 主要トレンドに対する3週間〜3ヶ月程度の調整。`押し目`や`戻り`の源です。

**小トレンド（Minor）** — 数日以内のノイズ。短期トレーダー以外は無視しても構いません。

:::tip
FXで応用する場合、日足を主要トレンド、4時間足を二次トレンド、1時間足以下を小トレンドと考えると整理しやすくなります。
:::

## トレンド転換の確認

ダウ理論では、`高値`と`安値`の更新パターンでトレンドを判定します。

- **上昇トレンド**: 高値も安値も切り上げ続ける
- **下降トレンド**: 高値も安値も切り下げ続ける
- **転換**: 直近の押し安値（または戻り高値）をブレイクして初めて転換と認識

:::example
USD/JPY が上昇トレンド中に押し安値を割り込んだ場合、これは「高値切り下げ」と合わせて下降トレンドへの転換シグナルになります。一本のローソク足ではなく、構造の変化を待つことが重要です。
:::

:::warning
小さな反発を「転換」と早合点しないでください。ダウ理論は遅行的ですが、その分だましが少なく、ポジションを長く保有する根拠になります。
:::$ja$,
  $en$Dow Theory is the foundation of modern technical analysis. Proposed by Charles Dow over a century ago, its principles still apply directly to FX trading today.

:::key
The core of Dow Theory: markets discount everything, trends exist in three magnitudes and three phases, and a trend remains in force until a clear reversal is confirmed.
:::

## The Six Tenets

1. **The market discounts everything** — fundamentals, sentiment, and news are already in price
2. **Trends have three magnitudes** — primary, secondary, and minor
3. **Primary trends have three phases** — accumulation, public participation, distribution
4. **Averages must confirm each other** — related markets/indexes should agree on direction
5. **Volume must confirm the trend** — volume should expand in the direction of the trend
6. **A trend is assumed in force until a clear reversal signal**

## The Three Magnitudes of Trend

**Primary trend** — Lasts a year or more. Read it on daily and weekly charts.

**Secondary trend** — A 3-week to 3-month correction against the primary. These produce `pullbacks` and `rallies`.

**Minor trend** — Noise lasting a few days. Safe to ignore unless you are a short-term trader.

:::tip
For FX, map the daily timeframe to the primary trend, the 4-hour to the secondary, and anything below the 1-hour to the minor. This keeps your analysis organized.
:::

## Confirming a Trend Change

Dow Theory identifies trends by the pattern of `highs` and `lows`:

- **Uptrend**: higher highs AND higher lows
- **Downtrend**: lower highs AND lower lows
- **Reversal**: confirmed only when the most recent swing low (or high) is broken

:::example
If USD/JPY is in an uptrend and breaks below the latest swing low, combined with a lower high, this is a confirmed reversal signal. Wait for a structural change, not a single candle.
:::

:::warning
Do not mistake every small bounce for a reversal. Dow Theory is lagging by design, but in exchange you get fewer false signals and a stronger thesis for holding positions.
:::$en$,
  $pt$A Teoria de Dow é o ponto de partida da análise técnica moderna. Proposta por Charles Dow há mais de um século, seus princípios continuam válidos para o trader de FX de hoje.

:::key
O núcleo da Teoria de Dow: o mercado desconta tudo, as tendências possuem três magnitudes e três fases, e uma tendência permanece em vigor até que uma reversão clara seja confirmada.
:::

## Os 6 Princípios Fundamentais

1. **O mercado desconta tudo** — fundamentos, sentimento e notícias já estão no preço
2. **As tendências têm três magnitudes** — primária, secundária e menor
3. **As tendências primárias têm três fases** — acumulação, participação pública, distribuição
4. **As médias devem confirmar umas às outras** — mercados relacionados devem concordar na direção
5. **O volume deve confirmar a tendência** — o volume deve crescer na direção da tendência
6. **Uma tendência continua em vigor até um sinal claro de reversão**

## As Três Magnitudes de Tendência

**Tendência primária** — Dura um ano ou mais. Identificada nos gráficos diário e semanal.

**Tendência secundária** — Correção de 3 semanas a 3 meses contra a primária. Origina `pullbacks` e `repiques`.

**Tendência menor** — Ruído de poucos dias. Pode ser ignorada por quem não opera no curtíssimo prazo.

:::tip
No FX, associe o diário à tendência primária, o gráfico de 4 horas à secundária e tudo abaixo de 1 hora à menor. Isso organiza a sua leitura.
:::

## Confirmando uma Mudança de Tendência

A Teoria de Dow identifica tendências pelo padrão de `topos` e `fundos`:

- **Alta**: topos mais altos E fundos mais altos
- **Baixa**: topos mais baixos E fundos mais baixos
- **Reversão**: confirmada somente quando o último fundo (ou topo) relevante é rompido

:::example
Se o USD/JPY está em tendência de alta e rompe a última mínima relevante, combinada com um topo mais baixo, temos um sinal confirmado de reversão. Espere a quebra de estrutura, não apenas um candle.
:::

:::warning
Não confunda qualquer repique pequeno com reversão. A Teoria de Dow é atrasada por natureza, mas em troca oferece menos falsos sinais e uma base sólida para segurar posições.
:::$pt$,
  $es$La Teoría de Dow es el punto de partida del análisis técnico moderno. Propuesta por Charles Dow hace más de un siglo, sus principios siguen aplicándose directamente al trading de FX actual.

:::key
El núcleo de la Teoría de Dow: el mercado descuenta todo, las tendencias tienen tres magnitudes y tres fases, y una tendencia permanece vigente hasta que se confirma una reversión clara.
:::

## Los 6 Principios Fundamentales

1. **El mercado descuenta todo** — fundamentos, sentimiento y noticias ya están en el precio
2. **Las tendencias tienen tres magnitudes** — primaria, secundaria y menor
3. **Las tendencias primarias tienen tres fases** — acumulación, participación pública, distribución
4. **Los promedios deben confirmarse mutuamente** — los mercados relacionados deben coincidir en la dirección
5. **El volumen debe confirmar la tendencia** — el volumen debe crecer en la dirección de la tendencia
6. **Una tendencia continúa vigente hasta una señal clara de reversión**

## Las Tres Magnitudes de Tendencia

**Tendencia primaria** — Dura un año o más. Se identifica en los gráficos diario y semanal.

**Tendencia secundaria** — Corrección de 3 semanas a 3 meses contra la primaria. Origina `pullbacks` y `rebotes`.

**Tendencia menor** — Ruido de pocos días. Puede ignorarse salvo para operadores de muy corto plazo.

:::tip
En FX, asocia el diario con la tendencia primaria, el de 4 horas con la secundaria y todo lo inferior a 1 hora con la menor. Esto ordena tu análisis.
:::

## Confirmando un Cambio de Tendencia

La Teoría de Dow identifica las tendencias mediante el patrón de `máximos` y `mínimos`:

- **Alza**: máximos más altos Y mínimos más altos
- **Baja**: máximos más bajos Y mínimos más bajos
- **Reversión**: confirmada solo cuando se rompe el último mínimo (o máximo) relevante

:::example
Si el USD/JPY está en tendencia alcista y rompe el último mínimo relevante, junto con un máximo más bajo, se confirma una reversión. Espera el cambio de estructura, no un solo candle.
:::

:::warning
No confundas cualquier rebote pequeño con una reversión. La Teoría de Dow es retrasada por diseño, pero a cambio entrega menos señales falsas y una base sólida para mantener posiciones.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'Dow Theory');

-- ============================================================================
-- 2. Elliott Wave Basics  (sort_order 101)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'エリオット波動の基礎', 'Elliott Wave Basics', 'Fundamentos das Ondas de Elliott', 'Fundamentos de las Ondas de Elliott',
  'advanced', false, 101, 12,
  $ja$エリオット波動理論は、相場が群集心理によって繰り返しパターンを描くという考え方です。基本構造はシンプルですが、奥深い分析手法です。

## 基本構造: 5波の推進と3波の修正

トレンドは「5波の推進波（Impulse）」と「3波の修正波（Correction）」で構成されます。

**推進波（1〜5）**
- **第1波**: 新しいトレンドの始まり。多くは小さく、見過ごされる
- **第2波**: 第1波の戻り。通常、第1波の50%〜61.8%を戻す
- **第3波**: 最も長く力強い波。第1波を超えてトレンドが本格化
- **第4波**: 利食いによる調整。第3波より浅め
- **第5波**: 最終波。ダイバージェンスが出やすい

**修正波（A・B・C）**
- **A波**: トレンドに逆行する最初の動き
- **B波**: A波に対する戻り
- **C波**: A波と同じ方向に伸びる最終下落

:::key
推進波は5つ、修正波は3つ。「5-3-5-3...」のリズムで市場は動きます。
:::

## 3つの絶対ルール

1. **第2波は第1波の始点を割らない**
2. **第3波が最も短い波になってはいけない**（通常は最長）
3. **第4波は第1波の高値領域に重ならない**

:::warning
このルールに違反するカウントは、たとえ綺麗に見えても間違いです。波動カウントが破綻したら、潔く修正してください。
:::

## 波動の階層（Degree）

エリオット波動は「フラクタル構造」を持っています。月足の第3波の中に、日足では1〜5波のサイクルが含まれます。

:::example
日足で上昇5波が完成 → 1時間足では「日足の第1波」の中に独自の5波サイクルが見える。階層を意識すると相場全体の位置がわかります。
:::

## FXトレードでの実践的な使い方

:::tip
完璧な波動カウントを追求するより、「今は第3波の中盤か、第5波の終盤か」だけを意識すれば十分です。第3波の中盤ならトレンドフォロー、第5波の終盤なら逆張りの準備をします。
:::

- **第3波エントリー**: 第2波の押し目から、第1波の高値ブレイクで参入
- **第5波の警戒**: RSIや MACD のダイバージェンスが出たら利食い検討
- **C波エントリー**: 修正波の中で、B波の戻り完了から狙う

:::warning
波動分析は主観的な要素が強いツールです。単独で使うのではなく、ダウ理論やサポレジと組み合わせてください。
:::$ja$,
  $en$Elliott Wave Theory holds that markets move in repeating patterns driven by crowd psychology. The structure is simple at the surface but deep in nuance.

## The Core Structure: 5 Impulse + 3 Correction

A trend consists of a 5-wave `impulse` followed by a 3-wave `correction`.

**Impulse waves (1-5)**
- **Wave 1**: Birth of a new trend. Often small and overlooked
- **Wave 2**: Retraces 50-61.8% of Wave 1
- **Wave 3**: Usually the longest and strongest wave
- **Wave 4**: Profit-taking pullback, shallower than Wave 2
- **Wave 5**: Final push, often shows divergence

**Corrective waves (A, B, C)**
- **Wave A**: First move against the trend
- **Wave B**: Retracement of A
- **Wave C**: Final move in the direction of A

:::key
Impulses have 5 waves, corrections have 3. Markets breathe in a "5-3-5-3..." rhythm.
:::

## The Three Absolute Rules

1. **Wave 2 never retraces beyond the start of Wave 1**
2. **Wave 3 is never the shortest impulse wave** (usually longest)
3. **Wave 4 never overlaps Wave 1's price territory**

:::warning
A count that breaks any of these rules is simply wrong, no matter how clean it looks. If your count breaks, recount honestly.
:::

## Wave Degrees (Fractal Nature)

Elliott Waves are fractal: inside a daily Wave 3, the 1-hour chart shows its own complete 5-wave cycle.

:::example
A daily 5-wave advance completes. On the 1-hour, "daily Wave 1" itself contains a full mini 5-wave cycle. Tracking degrees tells you where you are in the bigger picture.
:::

## Practical Use in FX

:::tip
Don't chase a perfect count. Just ask "Am I in the middle of Wave 3 or the end of Wave 5?" Mid-Wave 3 = trend-follow. Late Wave 5 = prepare to fade.
:::

- **Wave 3 entry**: Buy the Wave 2 pullback, confirm with break of Wave 1 high
- **Wave 5 caution**: Look for RSI / MACD divergence to exit
- **Wave C entry**: After Wave B completes within a correction

:::warning
Wave analysis is subjective by nature. Use it together with Dow structure and support/resistance, never alone.
:::$en$,
  $pt$A Teoria das Ondas de Elliott afirma que os mercados se movem em padrões repetitivos guiados pela psicologia das massas. A estrutura é simples na superfície e profunda no detalhe.

## Estrutura Básica: 5 Ondas de Impulso + 3 de Correção

Uma tendência é composta por um `impulso` de 5 ondas seguido por uma `correção` de 3 ondas.

**Ondas de impulso (1-5)**
- **Onda 1**: Nascimento da nova tendência. Costuma ser pequena e ignorada
- **Onda 2**: Retrai 50-61,8% da Onda 1
- **Onda 3**: Em geral a mais longa e forte
- **Onda 4**: Realização de lucros, mais rasa que a Onda 2
- **Onda 5**: Movimento final, frequentemente com divergência

**Ondas corretivas (A, B, C)**
- **Onda A**: Primeiro movimento contra a tendência
- **Onda B**: Repique de A
- **Onda C**: Movimento final na direção de A

:::key
Impulsos têm 5 ondas, correções têm 3. O mercado respira no ritmo "5-3-5-3...".
:::

## As Três Regras Absolutas

1. **A Onda 2 nunca retrai além do início da Onda 1**
2. **A Onda 3 nunca é a menor das ondas de impulso** (em geral é a maior)
3. **A Onda 4 não invade o território de preço da Onda 1**

:::warning
Uma contagem que viole qualquer dessas regras está errada, mesmo que pareça bonita. Se sua contagem quebra, refaça com honestidade.
:::

## Graus das Ondas (Fractalidade)

As Ondas de Elliott são fractais: dentro da Onda 3 do diário, o gráfico de 1 hora mostra seu próprio ciclo completo de 5 ondas.

:::example
Um avanço de 5 ondas se completa no diário. No de 1 hora, "Onda 1 do diário" contém seu próprio mini ciclo de 5 ondas. Acompanhar os graus mostra onde você está no quadro maior.
:::

## Uso Prático no FX

:::tip
Não busque uma contagem perfeita. Pergunte apenas "Estou no meio da Onda 3 ou no fim da Onda 5?". Meio da Onda 3 = seguir a tendência. Fim da Onda 5 = preparar reversão.
:::

- **Entrada na Onda 3**: comprar o pullback da Onda 2 com rompimento da máxima da Onda 1
- **Cautela na Onda 5**: buscar divergência no RSI / MACD para sair
- **Entrada na Onda C**: após a Onda B se completar dentro de uma correção

:::warning
A análise por ondas é subjetiva por natureza. Combine sempre com a estrutura de Dow e suporte/resistência, nunca use sozinha.
:::$pt$,
  $es$La Teoría de las Ondas de Elliott sostiene que los mercados se mueven en patrones repetitivos impulsados por la psicología de masas. La estructura es simple en la superficie y profunda en los detalles.

## Estructura Básica: 5 Ondas de Impulso + 3 de Corrección

Una tendencia se compone de un `impulso` de 5 ondas seguido por una `corrección` de 3 ondas.

**Ondas de impulso (1-5)**
- **Onda 1**: Nacimiento de una nueva tendencia. Suele ser pequeña y pasar desapercibida
- **Onda 2**: Retrae el 50-61,8% de la Onda 1
- **Onda 3**: Habitualmente la más larga y poderosa
- **Onda 4**: Toma de ganancias, menos profunda que la Onda 2
- **Onda 5**: Movimiento final, suele mostrar divergencia

**Ondas correctivas (A, B, C)**
- **Onda A**: Primer movimiento en contra de la tendencia
- **Onda B**: Rebote de A
- **Onda C**: Movimiento final en la dirección de A

:::key
Los impulsos tienen 5 ondas, las correcciones tienen 3. El mercado respira al ritmo "5-3-5-3...".
:::

## Las Tres Reglas Absolutas

1. **La Onda 2 nunca retrocede más allá del inicio de la Onda 1**
2. **La Onda 3 nunca es la onda de impulso más corta** (suele ser la más larga)
3. **La Onda 4 no invade el territorio de precio de la Onda 1**

:::warning
Un conteo que rompa cualquiera de estas reglas está mal, por más bonito que se vea. Si tu conteo se rompe, vuelve a contar con honestidad.
:::

## Grados de las Ondas (Fractalidad)

Las Ondas de Elliott son fractales: dentro de la Onda 3 del diario, el gráfico de 1 hora muestra su propio ciclo completo de 5 ondas.

:::example
Un avance de 5 ondas se completa en el diario. En 1 hora, la "Onda 1 del diario" contiene su propio mini ciclo de 5 ondas. Seguir los grados muestra dónde estás en el cuadro mayor.
:::

## Uso Práctico en FX

:::tip
No busques un conteo perfecto. Solo pregúntate "¿Estoy en plena Onda 3 o al final de la Onda 5?". Mitad de Onda 3 = seguir tendencia. Final de Onda 5 = prepararse para reversión.
:::

- **Entrada en Onda 3**: comprar el pullback de la Onda 2 con ruptura del máximo de la Onda 1
- **Precaución en Onda 5**: buscar divergencia en RSI / MACD para salir
- **Entrada en Onda C**: tras completarse la Onda B dentro de una corrección

:::warning
El análisis por ondas es subjetivo por naturaleza. Combínalo siempre con estructura de Dow y soporte/resistencia, nunca lo uses solo.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'Elliott Wave Basics');

-- ============================================================================
-- 3. Fibonacci Retracements & Extensions  (sort_order 102)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'フィボナッチ リトレースメント＆エクステンション', 'Fibonacci Retracements and Extensions', 'Retrações e Extensões de Fibonacci', 'Retrocesos y Extensiones de Fibonacci',
  'advanced', false, 102, 10,
  $ja$フィボナッチ数列から導かれる比率は、相場の押し目や利食い目標を測る強力なツールです。世界中のトレーダーが意識するため、自己実現的に機能します。

## フィボナッチ比率の基礎

主要な比率は次の通りです。

**リトレースメント（押し目・戻りの深さ）**
- **23.6%** — 浅い押し（強いトレンド時）
- **38.2%** — 健全なトレンドの押し目
- **50.0%** — 厳密にはフィボ比ではないが、最も意識される節目
- **61.8%** — `黄金比`の逆数。深い押し目だがトレンド継続の典型
- **78.6%** — トレンド転換の警戒ライン

**エクステンション（利食い目標）**
- **127.2%** — 最初の利食い候補
- **161.8%** — 最重要のターゲット（黄金比）
- **261.8%** — 強いトレンドの最終目標

:::key
50%と61.8%は最も意識されるゾーンです。ここで反発するか、抜けるかで相場の強弱がわかります。
:::

## リトレースメントの引き方

1. 直近のトレンドの始点と終点を特定する
2. **上昇トレンド**なら安値→高値方向にツールを引く
3. **下降トレンド**なら高値→安値方向に引く
4. 38.2%・50%・61.8%のゾーンを意識する

:::tip
1本の線ではなく、38.2%〜61.8%を「フィボゾーン」として捉えると、より柔軟に押し目を待てます。完璧な価格を狙うより、ゾーンへの到達を待ちましょう。
:::

## エクステンションでの利食い

エクステンションは、現在の波がどこまで伸びるかを推測するためのツールです。

:::example
USD/JPY が150.00から152.00まで上昇し（2円幅）、150.50まで押した後に再上昇する場合：
- 127.2%エクステンション = 152.54
- 161.8%エクステンション = 153.07
利食い目標として段階的に設定できます。
:::

## 他指標との合流（コンフルエンス）

:::tip
フィボ単独より、`水平サポレジ`や`移動平均線`との重なりを狙うとエッジが大きく増えます。例えば61.8%リトレースメントと200EMA、ロールリバーサルラインが重なるゾーンは反発の信頼度が非常に高くなります。
:::

## よくある間違い

:::warning
直近の小さな動きにフィボを引いても意味がありません。必ず明確な`スイング`（重要な高安）を起点にしてください。また、フィボは「絶対の支持線」ではなく「反応しやすいゾーン」だと理解しましょう。
:::$ja$,
  $en$Ratios derived from the Fibonacci sequence form a powerful tool for measuring pullbacks and profit targets. Because traders worldwide watch them, they become self-fulfilling.

## The Key Ratios

**Retracements (pullback depth)**
- **23.6%** — Shallow pullback (very strong trend)
- **38.2%** — Healthy trend pullback
- **50.0%** — Not technically a Fib ratio, but the most-watched mid-level
- **61.8%** — The `golden ratio` inverse. Deep but still typical of continuation
- **78.6%** — Trend-reversal warning zone

**Extensions (profit targets)**
- **127.2%** — First profit target
- **161.8%** — Primary target (golden ratio)
- **261.8%** — Final target in a powerful trend

:::key
50% and 61.8% are the most-watched zones. A bounce there confirms strength; a clean break suggests trend exhaustion.
:::

## How to Draw a Retracement

1. Identify the most recent swing high and swing low
2. **Uptrend**: draw from swing low to swing high
3. **Downtrend**: draw from swing high to swing low
4. Watch the 38.2 / 50 / 61.8 area as a reaction zone

:::tip
Treat the 38.2% - 61.8% area as a "Fib zone" rather than three exact lines. You stay more patient and stop chasing the perfect price.
:::

## Using Extensions to Set Targets

Extensions project how far the next leg may extend beyond the swing.

:::example
USD/JPY rallies from 150.00 to 152.00 (200-pip leg), then pulls back to 150.50 and resumes higher:
- 127.2% extension = 152.54
- 161.8% extension = 153.07
You can scale out at each target.
:::

## Confluence with Other Tools

:::tip
Fibs alone are okay; Fibs at confluence are powerful. The 61.8% retracement aligning with the 200 EMA and a prior support level is one of the highest-probability reversal zones in trading.
:::

## Common Mistakes

:::warning
Drawing Fibs on tiny intraday wiggles is meaningless. Anchor them to clear `swing` highs and lows. And remember: Fibs are not magic lines — they are zones where reaction is likely.
:::$en$,
  $pt$As razões derivadas da sequência de Fibonacci formam uma ferramenta poderosa para medir pullbacks e alvos de lucro. Como traders do mundo todo as observam, elas se tornam autorrealizáveis.

## As Razões Principais

**Retrações (profundidade do pullback)**
- **23,6%** — Pullback raso (tendência muito forte)
- **38,2%** — Pullback saudável em tendência
- **50,0%** — Tecnicamente não é uma razão de Fibo, mas o nível médio mais observado
- **61,8%** — Inverso da `proporção áurea`. Profundo mas típico de continuação
- **78,6%** — Zona de alerta para reversão

**Extensões (alvos de lucro)**
- **127,2%** — Primeiro alvo de lucro
- **161,8%** — Alvo principal (proporção áurea)
- **261,8%** — Alvo final em tendências fortes

:::key
50% e 61,8% são as zonas mais observadas. Um repique ali confirma força; um rompimento limpo sugere exaustão da tendência.
:::

## Como Traçar uma Retração

1. Identifique o topo e fundo de swing mais recentes
2. **Alta**: trace do fundo para o topo
3. **Baixa**: trace do topo para o fundo
4. Observe a região 38,2 / 50 / 61,8 como zona de reação

:::tip
Trate 38,2% - 61,8% como uma "zona de Fibo" em vez de três linhas exatas. Assim você fica mais paciente e para de caçar o preço perfeito.
:::

## Usando Extensões para Definir Alvos

As extensões projetam até onde a próxima perna pode se estender além do swing.

:::example
USD/JPY sobe de 150,00 para 152,00 (perna de 200 pips), corrige até 150,50 e retoma a alta:
- Extensão de 127,2% = 152,54
- Extensão de 161,8% = 153,07
Você pode parcializar em cada alvo.
:::

## Confluência com Outras Ferramentas

:::tip
Fibo sozinho é razoável; Fibo em confluência é poderoso. A retração de 61,8% alinhada com a média de 200 EMA e um suporte anterior é uma das zonas de reversão com maior probabilidade no trading.
:::

## Erros Comuns

:::warning
Traçar Fibos em pequenos balanços intradiários não tem valor. Ancore em `swings` (topos e fundos) claros. E lembre-se: Fibos não são linhas mágicas — são zonas onde a reação é provável.
:::$pt$,
  $es$Las razones derivadas de la secuencia de Fibonacci constituyen una herramienta poderosa para medir retrocesos y objetivos de ganancia. Como los traders del mundo entero las observan, se vuelven autocumplidas.

## Las Razones Clave

**Retrocesos (profundidad del pullback)**
- **23,6%** — Pullback superficial (tendencia muy fuerte)
- **38,2%** — Pullback sano en tendencia
- **50,0%** — Técnicamente no es una razón de Fibo, pero el nivel intermedio más observado
- **61,8%** — Inverso de la `proporción áurea`. Profundo pero típico de continuación
- **78,6%** — Zona de alerta de reversión

**Extensiones (objetivos de ganancia)**
- **127,2%** — Primer objetivo
- **161,8%** — Objetivo principal (proporción áurea)
- **261,8%** — Objetivo final en tendencias fuertes

:::key
50% y 61,8% son las zonas más observadas. Un rebote allí confirma fortaleza; una ruptura limpia sugiere agotamiento de tendencia.
:::

## Cómo Trazar un Retroceso

1. Identifica el máximo y mínimo de swing más recientes
2. **Alza**: traza desde el mínimo al máximo
3. **Baja**: traza desde el máximo al mínimo
4. Observa la región 38,2 / 50 / 61,8 como zona de reacción

:::tip
Trata 38,2% - 61,8% como una "zona de Fibo" en lugar de tres líneas exactas. Te volverás más paciente y dejarás de perseguir el precio perfecto.
:::

## Usando Extensiones para Fijar Objetivos

Las extensiones proyectan hasta dónde puede extenderse la siguiente pierna más allá del swing.

:::example
USD/JPY sube de 150,00 a 152,00 (pierna de 200 pips), corrige hasta 150,50 y retoma el alza:
- Extensión 127,2% = 152,54
- Extensión 161,8% = 153,07
Puedes parcializar en cada objetivo.
:::

## Confluencia con Otras Herramientas

:::tip
Fibo solo es aceptable; Fibo en confluencia es poderoso. El retroceso de 61,8% alineado con la EMA de 200 y un soporte previo es una de las zonas de reversión con mayor probabilidad en el trading.
:::

## Errores Comunes

:::warning
Trazar Fibos sobre pequeñas oscilaciones intradiarias no aporta valor. Ánclalos en `swings` (máximos y mínimos) claros. Y recuerda: los Fibos no son líneas mágicas, son zonas donde la reacción es probable.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'Fibonacci Retracements and Extensions');

-- ============================================================================
-- 4. Moving Average Crossovers  (sort_order 103)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  '移動平均線のクロス戦略', 'Moving Average Crossovers', 'Cruzamentos de Médias Móveis', 'Cruces de Medias Móviles',
  'advanced', false, 103, 9,
  $ja$移動平均線（MA）のクロスは、最も古典的でありながら現在も有効なトレンドフォロー手法です。シンプルさゆえに、初心者にも上級者にも使われています。

## 移動平均線の種類

**単純移動平均線（SMA）** — 過去N本の終値の平均。動きが滑らかでノイズに強い。

**指数移動平均線（EMA）** — 直近の価格に重みを置く。反応が早く、トレンドフォローに向く。

:::tip
EMAはSMAより早くシグナルを出します。短期トレードならEMA、長期分析ならSMAが一般的な選択です。
:::

## よく使われる期間

- **20日（または20本）**: 短期トレンド、デイトレード基準
- **50日**: 中期トレンド、スイングトレード基準
- **100日**: 中長期の方向感
- **200日**: 長期トレンドの王者、機関投資家が最も意識

## ゴールデンクロスとデッドクロス

**ゴールデンクロス**: 短期MAが長期MAを下から上に抜ける → 買いシグナル
**デッドクロス**: 短期MAが長期MAを上から下に抜ける → 売りシグナル

:::key
最も有名な組み合わせは「50日MA × 200日MA」のクロス。日足での発生は中長期トレンド転換の重要シグナルとされます。
:::

## クロスだけでは不十分

:::warning
レンジ相場ではクロスがだましになりやすく、連続して損失を出します。`MAの傾き`と`価格の位置`の両方を確認してください。
:::

良い買いシグナルの条件:
1. 短期MAが長期MAを上抜け（ゴールデンクロス）
2. 両方のMAが上向きの傾き
3. 価格が両MAの上にある
4. 上位足のトレンドも上向き

## MAの傾きとサポート機能

:::tip
クロスより重要なのが「MAの傾き」です。上向きのMAは強いサポート、下向きのMAは強いレジスタンスとして機能します。トレンド中、価格がMAにタッチした時の押し目買いも有効な手法です。
:::

:::example
EUR/USD の1時間足で、20EMAと50EMAが上向き、価格が両MAの上で推移。50EMAまで押した時に陽線のピンバーが出現 → 押し目買いエントリー。ストップロスは直近安値の下。
:::

## マルチタイムフレーム分析

長期足の方向と一致するクロスだけを取ることで、勝率が大きく向上します。

:::warning
日足で下降トレンド中の1時間足ゴールデンクロスは、多くの場合、戻り売りの絶好のサインに過ぎません。長期足の方向に逆らわないことが鉄則です。
:::$ja$,
  $en$Moving average (MA) crossovers are one of the oldest and still most reliable trend-following techniques. Simple enough for beginners, but used by professionals too.

## Types of Moving Averages

**Simple Moving Average (SMA)** — Equal weight to each of the last N closes. Smooth, less noisy.

**Exponential Moving Average (EMA)** — Weights recent prices more heavily. Reacts faster, ideal for trend following.

:::tip
EMAs deliver signals earlier than SMAs. Short-term traders typically prefer EMAs; longer-term analysts often stick with SMAs.
:::

## Common Periods

- **20**: Short-term trend, day trading baseline
- **50**: Medium-term trend, swing trading baseline
- **100**: Medium-to-long-term direction
- **200**: The institutional king — most-watched long-term MA

## Golden Cross and Death Cross

**Golden Cross**: Short MA crosses above long MA → bullish signal
**Death Cross**: Short MA crosses below long MA → bearish signal

:::key
The most famous combination is the 50-day x 200-day cross on the daily chart. Considered a major long-term trend-change signal.
:::

## Crosses Alone Are Not Enough

:::warning
In ranging markets, crossovers whipsaw and produce string losses. Always check the `slope of the MAs` and `where price sits relative to them`.
:::

A high-quality buy signal requires:
1. Short MA crosses above long MA (golden cross)
2. Both MAs sloping up
3. Price above both MAs
4. Higher timeframe is also up

## MA Slope and Dynamic Support

:::tip
Slope matters more than the cross itself. An upward-sloping MA acts as dynamic support; a downward one acts as dynamic resistance. Buying pullbacks to a rising MA during a trend is a classic, high-quality setup.
:::

:::example
EUR/USD 1-hour: 20 EMA and 50 EMA both rising, price above both. Price pulls back to the 50 EMA and prints a bullish pin bar — enter long, stop below the recent swing low.
:::

## Multi-Timeframe Filter

Taking only crosses that match the higher timeframe direction dramatically improves the win rate.

:::warning
A 1-hour golden cross during a daily downtrend is usually just an opportunity to sell the bounce. Never fight the higher timeframe.
:::$en$,
  $pt$Os cruzamentos de médias móveis (MA) são uma das técnicas de trend-following mais antigas e ainda mais confiáveis. Simples o suficiente para iniciantes, mas usadas também por profissionais.

## Tipos de Médias Móveis

**Média Móvel Simples (SMA)** — Peso igual para cada um dos últimos N fechamentos. Suave, menos ruído.

**Média Móvel Exponencial (EMA)** — Dá mais peso aos preços recentes. Reage mais rápido, ideal para trend-following.

:::tip
As EMAs dão sinais mais cedo que as SMAs. Traders de curto prazo costumam preferir EMAs; analistas de longo prazo, SMAs.
:::

## Períodos Comuns

- **20**: Tendência de curto prazo, base para day trade
- **50**: Tendência de médio prazo, base para swing
- **100**: Direção de médio a longo prazo
- **200**: A média institucional — a mais observada no longo prazo

## Golden Cross e Death Cross

**Golden Cross**: MA curta cruza acima da MA longa → sinal de compra
**Death Cross**: MA curta cruza abaixo da MA longa → sinal de venda

:::key
A combinação mais famosa é o cruzamento de 50 dias × 200 dias no diário. Considerada sinal de mudança de tendência de longo prazo.
:::

## Cruzamentos Sozinhos Não Bastam

:::warning
Em mercados de range, os cruzamentos viram pega-pega e geram perdas em sequência. Sempre confira a `inclinação das MAs` e `onde o preço está em relação a elas`.
:::

Um sinal de compra de qualidade exige:
1. MA curta cruzando acima da MA longa (golden cross)
2. Ambas inclinadas para cima
3. Preço acima de ambas
4. Timeframe maior também em alta

## Inclinação e Suporte Dinâmico

:::tip
A inclinação importa mais que o próprio cruzamento. Uma MA inclinada para cima funciona como suporte dinâmico; inclinada para baixo, como resistência dinâmica. Comprar pullbacks em uma MA ascendente durante uma tendência é uma configuração clássica de alta qualidade.
:::

:::example
EUR/USD em 1 hora: EMA de 20 e EMA de 50 ambas subindo, preço acima das duas. O preço corrige até a EMA de 50 e forma um pin bar de alta — compra, com stop abaixo da última mínima.
:::

## Filtro de Múltiplos Tempos Gráficos

Considerar apenas os cruzamentos alinhados com o timeframe maior melhora muito a taxa de acerto.

:::warning
Um golden cross de 1 hora em meio a uma tendência de baixa no diário costuma ser apenas uma oportunidade de vender o repique. Nunca brigue com o timeframe maior.
:::$pt$,
  $es$Los cruces de medias móviles (MA) son una de las técnicas de seguimiento de tendencia más antiguas y aún más confiables. Lo bastante simples para principiantes, pero también usadas por profesionales.

## Tipos de Medias Móviles

**Media Móvil Simple (SMA)** — Peso igual a cada uno de los últimos N cierres. Suave, menos ruidosa.

**Media Móvil Exponencial (EMA)** — Da más peso a los precios recientes. Reacciona más rápido, ideal para seguir tendencia.

:::tip
Las EMAs dan señales antes que las SMAs. Los traders de corto plazo suelen preferir EMAs; los analistas de largo plazo, SMAs.
:::

## Períodos Comunes

- **20**: Tendencia de corto plazo, base para day trading
- **50**: Tendencia de medio plazo, base para swing
- **100**: Dirección de mediano a largo plazo
- **200**: La media institucional — la más observada en el largo plazo

## Golden Cross y Death Cross

**Golden Cross**: la MA corta cruza por encima de la larga → señal alcista
**Death Cross**: la MA corta cruza por debajo de la larga → señal bajista

:::key
La combinación más famosa es el cruce 50 × 200 en el diario. Se considera una señal clave de cambio de tendencia de largo plazo.
:::

## Los Cruces Solos No Bastan

:::warning
En mercados laterales, los cruces dan whipsaws y producen pérdidas en cadena. Revisa siempre la `inclinación de las MAs` y `dónde se sitúa el precio respecto a ellas`.
:::

Una señal de compra de calidad exige:
1. MA corta cruza por encima de la larga (golden cross)
2. Ambas inclinadas hacia arriba
3. Precio por encima de ambas
4. Timeframe mayor también alcista

## Inclinación y Soporte Dinámico

:::tip
La inclinación importa más que el cruce mismo. Una MA con pendiente positiva actúa como soporte dinámico; con pendiente negativa, como resistencia dinámica. Comprar pullbacks a una MA ascendente durante una tendencia es una configuración clásica de alta calidad.
:::

:::example
EUR/USD en 1 hora: EMA de 20 y EMA de 50 ambas subiendo, precio por encima de las dos. El precio retrocede hasta la EMA de 50 y forma un pin bar alcista — entrada larga, stop debajo del último mínimo.
:::

## Filtro Multimarco Temporal

Tomar solo los cruces alineados con el timeframe mayor mejora notablemente la tasa de acierto.

:::warning
Un golden cross de 1 hora dentro de una tendencia bajista del diario suele ser simplemente una oportunidad para vender el rebote. Nunca pelees contra el timeframe mayor.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'Moving Average Crossovers');

-- ============================================================================
-- 5. RSI & Stochastic Oscillators  (sort_order 104)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'RSIとストキャスティクス', 'RSI and Stochastic Oscillators', 'RSI e Estocástico', 'RSI y Estocástico',
  'advanced', false, 104, 11,
  $ja$RSIとストキャスティクスは、相場の「買われすぎ・売られすぎ」を測るオシレーター系指標の代表格です。トレンドの勢いや反転の兆しを掴むのに役立ちます。

## RSI（相対力指数）の基本

RSIは0〜100の範囲で動き、過去N期間（一般的に14）の上昇幅と下落幅の比率を示します。

**重要なレベル**
- **70以上**: 買われすぎ（Overbought）
- **30以下**: 売られすぎ（Oversold）
- **50ライン**: トレンドの中心軸

:::key
RSIは「買われすぎ＝即売り」ではありません。強いトレンドではRSIが70以上に張り付いたまま価格が上昇し続けます。
:::

## ストキャスティクスの基本

ストキャスティクスは、現在の価格が過去N期間のレンジのどこにあるかを示します。

**主要な構成要素**
- **%K**: メインライン（早い動き）
- **%D**: シグナルライン（%Kの移動平均）

**重要なレベル**
- **80以上**: 買われすぎ
- **20以下**: 売られすぎ

## RSIとストキャスティクスの違い

:::tip
ストキャスティクスはRSIより反応が早く、シグナルが多めに出ます。レンジ相場ではストキャス、トレンド相場ではRSI、という使い分けが一般的です。
:::

## ダイバージェンス（逆行現象）

オシレーター活用の最大の武器が`ダイバージェンス`です。

**強気ダイバージェンス**: 価格が安値を更新したのに、RSIは前の安値より高い → 下落の勢いが弱まっている → 反転の兆し

**弱気ダイバージェンス**: 価格が高値を更新したのに、RSIは前の高値より低い → 上昇の勢いが弱まっている → 反転の兆し

:::example
USD/JPY が150.00 → 149.00 → 148.50と安値を更新中、RSIは22 → 28 → 32と切り上がっている → 強気ダイバージェンス成立。サポートゾーンと重なれば、買い検討の根拠になります。
:::

## 実践的な使い方

:::tip
オシレーターは単独で使わず、必ずトレンド方向の確認と組み合わせてください。日足が上昇トレンド中なら、1時間足のRSI30付近を「押し目買いの機会」として捉える、という使い方が効果的です。
:::

良くないシグナル例:
- 強い上昇トレンド中にRSI70越えで売る → 大半は早すぎる逆張り
- レンジ相場でストキャスを無視 → エントリーチャンスを逃す

## ダイバージェンスの落とし穴

:::warning
ダイバージェンスは強力ですが、「いつ反転するか」は教えてくれません。ダイバージェンスが3〜5回連続で出ても反転しないこともあります。価格の反転シグナル（ローソク足パターンや構造ブレイク）を待ってからエントリーしましょう。
:::$ja$,
  $en$RSI and Stochastic are the most popular `oscillator` indicators, designed to measure when markets are overbought or oversold. They help you spot momentum shifts and possible reversals.

## RSI Basics

The Relative Strength Index ranges from 0 to 100 and compares the size of up moves vs down moves over the past N periods (commonly 14).

**Key Levels**
- **Above 70**: Overbought
- **Below 30**: Oversold
- **50**: Trend midline

:::key
"Overbought" doesn't mean "sell immediately." In strong trends, RSI can pin above 70 while price keeps rising for days.
:::

## Stochastic Basics

Stochastic shows where the current close sits within the recent N-period range.

**Components**
- **%K**: fast main line
- **%D**: signal line (moving average of %K)

**Key Levels**
- **Above 80**: Overbought
- **Below 20**: Oversold

## RSI vs Stochastic

:::tip
Stochastic reacts faster and gives more signals than RSI. A common practice: use Stochastic in ranging markets and RSI in trending markets.
:::

## Divergence (The Real Power)

The most valuable use of oscillators is spotting `divergence`.

**Bullish divergence**: price prints a lower low but the oscillator prints a higher low → selling pressure is fading → potential reversal up

**Bearish divergence**: price prints a higher high but the oscillator prints a lower high → buying pressure is fading → potential reversal down

:::example
USD/JPY prints lower lows at 150.00 → 149.00 → 148.50, while RSI prints 22 → 28 → 32. That's a clean bullish divergence. Combine it with a support zone for a high-quality long setup.
:::

## Practical Use

:::tip
Oscillators work best as a filter, not a primary entry trigger. In a daily uptrend, treat RSI dipping near 30 on the 1-hour as a pullback-buying opportunity, not a reversal signal.
:::

Bad uses to avoid:
- Shorting just because RSI > 70 in a strong uptrend (usually too early)
- Ignoring Stochastic in ranging markets (you miss good entries)

## The Divergence Trap

:::warning
Divergence is powerful but it doesn't tell you WHEN price will turn. Markets can show 3-5 divergences in a row before actually reversing. Always wait for a price-action confirmation (reversal candle or structure break) before entering.
:::$en$,
  $pt$O RSI e o Estocástico são os indicadores `osciladores` mais populares, criados para medir quando o mercado está sobrecomprado ou sobrevendido. Ajudam a detectar mudanças de momento e possíveis reversões.

## Fundamentos do RSI

O Índice de Força Relativa varia de 0 a 100 e compara o tamanho dos movimentos de alta e de baixa nos últimos N períodos (geralmente 14).

**Níveis Principais**
- **Acima de 70**: sobrecompra
- **Abaixo de 30**: sobrevenda
- **50**: linha central de tendência

:::key
"Sobrecomprado" não significa "vender já". Em tendências fortes, o RSI pode ficar acima de 70 enquanto o preço continua subindo por dias.
:::

## Fundamentos do Estocástico

O Estocástico mostra onde o fechamento atual está dentro da faixa dos últimos N períodos.

**Componentes**
- **%K**: linha principal rápida
- **%D**: linha de sinal (média móvel de %K)

**Níveis Principais**
- **Acima de 80**: sobrecompra
- **Abaixo de 20**: sobrevenda

## RSI vs Estocástico

:::tip
O Estocástico reage mais rápido e gera mais sinais que o RSI. Uma prática comum: usar Estocástico em mercados laterais e RSI em mercados em tendência.
:::

## Divergência (O Verdadeiro Poder)

O uso mais valioso dos osciladores é detectar `divergência`.

**Divergência de alta**: o preço faz um fundo mais baixo, mas o oscilador faz um fundo mais alto → pressão vendedora enfraquecendo → potencial reversão de alta

**Divergência de baixa**: o preço faz um topo mais alto, mas o oscilador faz um topo mais baixo → pressão compradora enfraquecendo → potencial reversão de baixa

:::example
USD/JPY faz fundos cada vez mais baixos em 150,00 → 149,00 → 148,50, enquanto o RSI vai de 22 → 28 → 32. Divergência de alta limpa. Combinada com uma zona de suporte, vira uma compra de alta qualidade.
:::

## Uso Prático

:::tip
Osciladores funcionam melhor como filtro, não como gatilho principal. Em uma tendência de alta no diário, trate o RSI próximo de 30 no gráfico de 1 hora como oportunidade de compra em pullback, não como sinal de reversão.
:::

Usos a evitar:
- Vender só porque o RSI passou de 70 numa forte tendência de alta (geralmente cedo demais)
- Ignorar o Estocástico em mercados laterais (perde entradas boas)

## A Armadilha da Divergência

:::warning
A divergência é poderosa, mas não diz QUANDO o preço vai virar. O mercado pode mostrar 3 a 5 divergências seguidas antes de reverter. Sempre espere uma confirmação de price action (candle de reversão ou quebra de estrutura) antes de entrar.
:::$pt$,
  $es$El RSI y el Estocástico son los indicadores `osciladores` más populares, diseñados para medir cuándo el mercado está sobrecomprado o sobrevendido. Ayudan a detectar cambios de momento y posibles reversiones.

## Fundamentos del RSI

El Índice de Fuerza Relativa va de 0 a 100 y compara el tamaño de los movimientos al alza y a la baja en los últimos N períodos (habitualmente 14).

**Niveles Clave**
- **Por encima de 70**: sobrecompra
- **Por debajo de 30**: sobreventa
- **50**: línea central de tendencia

:::key
"Sobrecomprado" no significa "vender ya". En tendencias fuertes, el RSI puede mantenerse sobre 70 mientras el precio sigue subiendo varios días.
:::

## Fundamentos del Estocástico

El Estocástico muestra dónde está el cierre actual dentro del rango de los últimos N períodos.

**Componentes**
- **%K**: línea principal rápida
- **%D**: línea de señal (media móvil de %K)

**Niveles Clave**
- **Por encima de 80**: sobrecompra
- **Por debajo de 20**: sobreventa

## RSI vs Estocástico

:::tip
El Estocástico reacciona más rápido y entrega más señales que el RSI. Práctica habitual: Estocástico en mercados laterales, RSI en mercados con tendencia.
:::

## Divergencia (El Verdadero Poder)

El uso más valioso de los osciladores es detectar `divergencia`.

**Divergencia alcista**: el precio marca un mínimo más bajo, pero el oscilador marca un mínimo más alto → la presión vendedora se debilita → posible reversión al alza

**Divergencia bajista**: el precio marca un máximo más alto, pero el oscilador marca un máximo más bajo → la presión compradora se debilita → posible reversión a la baja

:::example
USD/JPY marca mínimos cada vez más bajos en 150,00 → 149,00 → 148,50, mientras el RSI va de 22 → 28 → 32. Divergencia alcista limpia. Combinada con una zona de soporte, se convierte en una compra de alta calidad.
:::

## Uso Práctico

:::tip
Los osciladores rinden mejor como filtro, no como gatillo principal. En una tendencia alcista del diario, trata al RSI cerca de 30 en el gráfico de 1 hora como oportunidad de compra en pullback, no como señal de reversión.
:::

Usos a evitar:
- Vender solo porque el RSI superó 70 en una fuerte tendencia alcista (suele ser demasiado pronto)
- Ignorar el Estocástico en mercados laterales (te pierdes buenas entradas)

## La Trampa de la Divergencia

:::warning
La divergencia es poderosa, pero no te dice CUÁNDO girará el precio. El mercado puede mostrar 3 a 5 divergencias seguidas antes de revertir. Espera siempre una confirmación de price action (candle de reversión o ruptura de estructura) antes de entrar.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'RSI and Stochastic Oscillators');

-- ============================================================================
-- 6. MACD: Signal, Histogram & Divergence  (sort_order 105)
-- ============================================================================

insert into public.school_lessons
  (category_id, title_ja, title_en, title_pt, title_es,
   difficulty, is_free, sort_order, duration_minutes,
   content_ja, content_en, content_pt, content_es)
select
  (select id from public.school_categories where name_en = 'Technical Analysis'),
  'MACD: シグナル・ヒストグラム・ダイバージェンス', 'MACD: Signal, Histogram and Divergence', 'MACD: Sinal, Histograma e Divergência', 'MACD: Señal, Histograma y Divergencia',
  'advanced', false, 105, 10,
  $ja$MACD（マックディー）は、トレンド系とオシレーター系の特徴を併せ持つ、最も人気のあるテクニカル指標の一つです。3つの構成要素を理解すれば、トレンドの強さ・転換・勢いの変化を一目で判断できます。

## MACDの3つの構成要素

**MACDライン** — 短期EMA（12）と長期EMA（26）の差。トレンドの方向と強さを示す。

**シグナルライン** — MACDラインの9期間EMA。エントリータイミングのトリガー。

**ヒストグラム** — MACDラインとシグナルラインの差を棒グラフで表示。`勢いの変化`を視覚化する。

:::key
MACDは「Moving Average Convergence Divergence」の略。2本の移動平均線が近づいたり離れたりする様子を可視化したもの、と考えると本質がわかります。
:::

## 3つの主要シグナル

### 1. シグナルラインクロス

最も基本的なシグナルです。

- **MACDラインがシグナルラインを上抜け** → 買いシグナル
- **MACDラインがシグナルラインを下抜け** → 売りシグナル

:::tip
シグナルラインクロスは頻繁に出るため、`ゼロライン`より下でのゴールデンクロス（買い）、ゼロラインより上でのデッドクロス（売り）に絞ると質が上がります。
:::

### 2. ゼロラインクロス

MACDラインがゼロを上抜け → 短期EMAが長期EMAを上抜けた → トレンド転換の確認。

### 3. ダイバージェンス

価格と MACD の動きが逆行する現象。最も信頼性の高いシグナルです。

:::example
USD/JPY が150 → 152 → 153と高値更新する中、MACDヒストグラムは6 → 4 → 2と縮小 → 上昇の勢いが衰えている → 弱気ダイバージェンス。利食いや逆張り検討の材料になります。
:::

## ヒストグラムの活用

ヒストグラムは MACD分析の中で最も実用的な部分です。

**ヒストグラムが拡大** → トレンドが加速している
**ヒストグラムが縮小** → トレンドが減速している
**ヒストグラムがゼロを横切る** → MACDがシグナルラインをクロスした瞬間

:::tip
シグナルラインクロスを待つより、`ヒストグラムのピーク`を観察する方が早いシグナルになります。ヒストグラムが2〜3本連続で縮小したら、勢いの転換が近い証拠です。
:::

## 実践的な戦略

**トレンドフォロー戦略**
1. 上位足（4時間足など）でMACDがゼロライン上で推移
2. 下位足（1時間足）でMACDがシグナルラインを上抜け
3. 押し目のローソク足反転パターンでエントリー

**反転戦略**
1. 強いトレンドの中でダイバージェンスを確認
2. 重要サポレジゾーンと重なるか確認
3. 価格の反転パターン（ピンバー、包み足）でエントリー

:::warning
MACDは遅行指標です。シグナルが出た時点で価格はかなり動いてしまっていることが多いので、エントリー価格の悪化に注意してください。特にレンジ相場では連続損失の原因になります。
:::

## 設定のカスタマイズ

標準は「12-26-9」ですが、自分のトレードスタイルに合わせて調整できます。

- **短期トレード**: 5-13-1 や 8-17-9（反応が早くなるがノイズも増える）
- **長期トレード**: 19-39-9（シグナルが減るが信頼度が上がる）

:::warning
設定をいじりすぎると過去最適化（カーブフィッティング）に陥ります。基本は「12-26-9」のまま、文脈の読み方を上達させる方が長期的に賢明です。
:::$ja$,
  $en$MACD (Moving Average Convergence Divergence) is one of the most popular indicators because it combines trend-following and momentum analysis. Master its three components and you can read trend direction, exhaustion, and momentum shifts at a glance.

## The Three Components

**MACD Line** — The difference between the 12-period and 26-period EMAs. Shows trend direction and strength.

**Signal Line** — The 9-period EMA of the MACD line. Acts as the trigger for entries.

**Histogram** — The bar chart showing the gap between MACD and Signal. Visualizes `momentum change`.

:::key
MACD literally means "Moving Average Convergence Divergence." Think of it as a visual of two EMAs widening apart or coming back together — that's the essence.
:::

## The Three Main Signals

### 1. Signal Line Cross

The most basic signal.

- **MACD crosses above Signal** → bullish
- **MACD crosses below Signal** → bearish

:::tip
Signal line crosses happen often. Filter to only "bullish crosses below the `zero line`" or "bearish crosses above the zero line" and signal quality improves dramatically.
:::

### 2. Zero Line Cross

When the MACD line crosses above zero, the short EMA has crossed above the long EMA — a confirmed trend change.

### 3. Divergence

When price and MACD move in opposite directions. The most reliable MACD signal.

:::example
USD/JPY rallies 150 → 152 → 153 (higher highs) but MACD histogram shrinks from 6 → 4 → 2. That's bearish divergence — momentum is fading, time to consider taking profit or fading.
:::

## Using the Histogram

The histogram is the most actionable part of MACD.

**Histogram expanding** → trend is accelerating
**Histogram shrinking** → trend is decelerating
**Histogram crosses zero** → the moment MACD crosses Signal

:::tip
Watching the `histogram peaks` gives earlier signals than waiting for the signal line cross. 2-3 consecutive shrinking bars often precede a momentum reversal.
:::

## Practical Strategies

**Trend-following play**
1. Higher timeframe (e.g. 4-hour) MACD above zero
2. Lower timeframe (1-hour) MACD crosses above Signal
3. Enter on a candlestick reversal pattern at the pullback

**Reversal play**
1. Confirm divergence inside a strong trend
2. Check overlap with major support / resistance
3. Enter on a price-action reversal candle (pin bar, engulfing)

:::warning
MACD is a lagging indicator. By the time the signal fires, price has often already moved a lot. Watch out for poor entry prices, especially in ranges where MACD whipsaws.
:::

## Customizing the Settings

The default is 12-26-9, but you can adjust:

- **Short-term**: 5-13-1 or 8-17-9 (faster but noisier)
- **Long-term**: 19-39-9 (fewer signals, higher confidence)

:::warning
Endless tweaking leads to curve-fitting. Most pros stick with 12-26-9 and focus on reading context better — that pays off more in the long run.
:::$en$,
  $pt$O MACD (Moving Average Convergence Divergence) é um dos indicadores mais populares porque combina trend-following com análise de momento. Domine seus três componentes e você lerá direção, exaustão e mudanças de momento da tendência num só olhar.

## Os Três Componentes

**Linha MACD** — A diferença entre as EMAs de 12 e 26 períodos. Mostra direção e força da tendência.

**Linha de Sinal** — EMA de 9 períodos da linha MACD. Funciona como gatilho de entrada.

**Histograma** — Gráfico de barras com a diferença entre MACD e Sinal. Visualiza a `mudança de momento`.

:::key
MACD significa "Convergência e Divergência de Médias Móveis". Pense nele como a visualização de duas EMAs se afastando ou voltando a se aproximar — essa é a essência.
:::

## Os Três Sinais Principais

### 1. Cruzamento da Linha de Sinal

O sinal mais básico.

- **MACD cruza acima do Sinal** → alta
- **MACD cruza abaixo do Sinal** → baixa

:::tip
Cruzamentos de sinal acontecem com frequência. Filtre apenas os "cruzamentos altistas abaixo da `linha zero`" ou "baixistas acima da linha zero" e a qualidade dos sinais melhora muito.
:::

### 2. Cruzamento da Linha Zero

Quando a linha MACD cruza acima de zero, a EMA curta cruzou acima da longa — mudança de tendência confirmada.

### 3. Divergência

Quando preço e MACD se movem em sentidos opostos. O sinal mais confiável do MACD.

:::example
USD/JPY sobe 150 → 152 → 153 (topos mais altos), mas o histograma do MACD encolhe de 6 → 4 → 2. Divergência baixista — o momento está sumindo, hora de considerar realizar lucros ou operar contra.
:::

## Usando o Histograma

O histograma é a parte mais prática do MACD.

**Histograma expandindo** → tendência acelerando
**Histograma encolhendo** → tendência desacelerando
**Histograma cruza o zero** → exatamente quando MACD cruza o Sinal

:::tip
Observar os `picos do histograma` dá sinais mais cedo do que esperar o cruzamento da linha de sinal. 2 a 3 barras consecutivas encolhendo costumam preceder uma reversão de momento.
:::

## Estratégias Práticas

**Trend-following**
1. MACD do timeframe maior (ex.: 4 horas) acima de zero
2. MACD do timeframe menor (1 hora) cruza acima do Sinal
3. Entra em um padrão de candle de reversão no pullback

**Reversão**
1. Confirme divergência dentro de uma tendência forte
2. Verifique sobreposição com suporte / resistência importante
3. Entra em candle de price action de reversão (pin bar, engolfo)

:::warning
O MACD é um indicador atrasado. Quando o sinal dispara, o preço muitas vezes já se moveu bastante. Cuidado com entradas em preços ruins, especialmente em mercados laterais onde o MACD vira pega-pega.
:::

## Customizando os Parâmetros

O padrão é 12-26-9, mas você pode ajustar:

- **Curto prazo**: 5-13-1 ou 8-17-9 (mais rápido mas mais ruidoso)
- **Longo prazo**: 19-39-9 (menos sinais, maior confiança)

:::warning
Ajustar demais leva a curve-fitting. A maioria dos profissionais mantém 12-26-9 e foca em ler melhor o contexto — isso paga mais no longo prazo.
:::$pt$,
  $es$El MACD (Moving Average Convergence Divergence) es uno de los indicadores más populares porque combina seguimiento de tendencia con análisis de momento. Domina sus tres componentes y leerás dirección, agotamiento y cambios de momento de la tendencia de un vistazo.

## Los Tres Componentes

**Línea MACD** — La diferencia entre las EMAs de 12 y 26 períodos. Muestra dirección y fuerza de la tendencia.

**Línea de Señal** — EMA de 9 períodos de la línea MACD. Funciona como gatillo de entrada.

**Histograma** — Gráfico de barras con la distancia entre MACD y Señal. Visualiza el `cambio de momento`.

:::key
MACD significa "Convergencia y Divergencia de Medias Móviles". Piénsalo como la visualización de dos EMAs alejándose o volviendo a juntarse — esa es la esencia.
:::

## Las Tres Señales Principales

### 1. Cruce de la Línea de Señal

La señal más básica.

- **MACD cruza por encima de la Señal** → alcista
- **MACD cruza por debajo de la Señal** → bajista

:::tip
Los cruces de señal ocurren con frecuencia. Filtra solo "cruces alcistas debajo de la `línea cero`" o "bajistas encima de la línea cero" y la calidad de señal mejora mucho.
:::

### 2. Cruce de la Línea Cero

Cuando la línea MACD cruza por encima de cero, la EMA corta cruzó la larga — cambio de tendencia confirmado.

### 3. Divergencia

Cuando precio y MACD se mueven en sentidos opuestos. La señal más fiable del MACD.

:::example
USD/JPY sube 150 → 152 → 153 (máximos más altos), pero el histograma del MACD se reduce de 6 → 4 → 2. Divergencia bajista — el momento se desvanece, hora de considerar tomar ganancias o ir en contra.
:::

## Uso del Histograma

El histograma es la parte más práctica del MACD.

**Histograma expandiéndose** → tendencia acelerando
**Histograma reduciéndose** → tendencia desacelerando
**Histograma cruza el cero** → justo cuando MACD cruza la Señal

:::tip
Observar los `picos del histograma` ofrece señales antes que esperar el cruce de la línea de señal. 2 a 3 barras consecutivas reduciéndose suelen preceder a una reversión de momento.
:::

## Estrategias Prácticas

**Trend-following**
1. MACD del timeframe mayor (ej. 4 horas) sobre cero
2. MACD del timeframe menor (1 hora) cruza por encima de la Señal
3. Entra con un patrón de candle de reversión en el pullback

**Reversión**
1. Confirma divergencia dentro de una tendencia fuerte
2. Verifica solapamiento con soporte / resistencia importante
3. Entra con candle de price action de reversión (pin bar, envolvente)

:::warning
El MACD es un indicador retrasado. Cuando la señal aparece, el precio suele haberse movido bastante. Cuidado con entradas a precios malos, sobre todo en rangos donde el MACD genera whipsaws.
:::

## Personalizando los Parámetros

El estándar es 12-26-9, pero se puede ajustar:

- **Corto plazo**: 5-13-1 u 8-17-9 (más rápido pero más ruidoso)
- **Largo plazo**: 19-39-9 (menos señales, más confianza)

:::warning
Ajustar en exceso lleva a curve-fitting. La mayoría de los profesionales se queda con 12-26-9 y se concentra en leer mejor el contexto — eso paga más a largo plazo.
:::$es$
where not exists (select 1 from public.school_lessons where title_en = 'MACD: Signal, Histogram and Divergence');
