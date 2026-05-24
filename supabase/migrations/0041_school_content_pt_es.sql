-- TradeLog: Populate Portuguese (pt-BR) and Spanish (es / Latin America) translations
-- for the body content of the 7 school lessons.
--
-- The columns content_pt / content_es already exist on public.school_lessons.
-- This migration only sets content_pt and content_es (it does NOT touch content_ja /
-- content_en or the schema). Translations mirror the canonical English source from
-- 0033_school_lesson_content_visuals.sql, preserving the exact markdown structure and
-- the custom :::tip / :::warning / :::key / :::example / :::diagram::: blocks.
--
-- Idempotent: re-running simply re-sets the same values, matched by title_en.
-- Dollar-quoted strings ($pt$...$pt$ / $es$...$es$) are used so the markdown bodies
-- can contain any characters without escaping.

-- ============================================================================
-- FX Basics: What is Forex?
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$O FX (Foreign Exchange) é a negociação de pares de moedas para lucrar com as variações da taxa de câmbio. É o maior mercado financeiro do mundo.

:::key
O mercado de FX negocia aproximadamente US$ 7 trilhões por dia — muitas vezes maior que o mercado de ações. Bancos, instituições e traders individuais participam no mundo inteiro.
:::

## Por que o FX é Popular

**Negociação 24 horas** — De domingo à noite até sexta à noite (horário de Nova York), o mercado está sempre aberto. Como as sessões de Tóquio, Londres e Nova York se sobrepõem, você pode operar de acordo com a sua rotina.

**Comece com pouco capital** — A `alavancagem` permite controlar posições grandes com um capital relativamente pequeno. Com alavancagem de 50:1, US$ 2.000 podem controlar US$ 100.000 em operações.

**Lucre em qualquer direção** — Diferente das ações, no FX é fácil vender a descoberto (short). Não importa se o mercado sobe ou cai, você pode lucrar se acertar a direção.

## Como o FX Funciona

O FX sempre envolve negociar duas moedas como um par. Por exemplo, com EUR/USD:

- **Compra (Long)**: Compra euros, vende dólares → Lucro se o EUR se valorizar
- **Venda (Short)**: Vende euros, compra dólares → Lucro se o EUR se desvalorizar

:::example
Compre 10.000 USD/JPY a 150,00 e venda a 152,00: (152 - 150) × 10.000 = ¥20.000 de lucro
:::

## Riscos do FX

:::warning
A mesma alavancagem que amplifica os lucros também amplifica as perdas. Sem uma gestão de risco adequada, você pode perder seu capital rapidamente.
:::

Esta escola vai te ensinar a operar de forma responsável, com uma gestão de risco adequada.$pt$,
       content_es = $es$El FX (Foreign Exchange) es la negociación de pares de divisas para obtener ganancias con los movimientos del tipo de cambio. Es el mercado financiero más grande del mundo.

:::key
El mercado de FX negocia aproximadamente US$ 7 billones por día — muchas veces más grande que el mercado de acciones. Bancos, instituciones y traders individuales participan en todo el mundo.
:::

## Por qué el FX es Popular

**Operación las 24 horas** — Desde el domingo por la noche hasta el viernes por la noche (horario de Nueva York), el mercado siempre está abierto. Como las sesiones de Tokio, Londres y Nueva York se superponen, puedes operar según tu horario.

**Empieza con poco capital** — El `apalancamiento` te permite controlar posiciones grandes con un capital relativamente pequeño. Con apalancamiento de 50:1, US$ 2.000 pueden controlar US$ 100.000 en operaciones.

**Gana en cualquier dirección** — A diferencia de las acciones, en el FX es fácil vender en corto (short). No importa si el mercado sube o baja, puedes ganar si predices la dirección correctamente.

## Cómo Funciona el FX

El FX siempre implica negociar dos divisas como un par. Por ejemplo, con EUR/USD:

- **Compra (Long)**: Compra euros, vende dólares → Ganancia si el EUR se fortalece
- **Venta (Short)**: Vende euros, compra dólares → Ganancia si el EUR se debilita

:::example
Compra 10.000 USD/JPY a 150,00 y vende a 152,00: (152 - 150) × 10.000 = ¥20.000 de ganancia
:::

## Riesgos del FX

:::warning
El mismo apalancamiento que amplifica las ganancias también amplifica las pérdidas. Sin una gestión de riesgo adecuada, puedes perder tu capital rápidamente.
:::

Esta escuela te enseñará a operar de forma responsable, con una gestión de riesgo adecuada.$es$
 where title_en = 'What is Forex?';

-- ============================================================================
-- FX Basics: How Currency Pairs Work
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$Os pares de moedas são a base da negociação no FX. Eles mostram qual moeda você compra e qual você vende.

## Como Ler os Pares de Moedas

:::diagram:currency_flow:::

EUR/USD = 1.0850 significa:
- **Esquerda (EUR)** = `Moeda Base` (Base Currency)
- **Direita (USD)** = `Moeda de Cotação` (Quote Currency)
- **1.0850** = 1 euro custa 1,0850 dólares

:::tip
Preço subindo = a moeda base está ficando mais forte. Preço caindo = a moeda base está ficando mais fraca.
:::

## Pares Principais (Majors)

**EUR/USD** — O par mais negociado do mundo. Forma tendências bem definidas durante as sessões de Londres e Nova York.

**USD/JPY** — Popular entre os traders asiáticos. Relativamente estável, bom para iniciantes.

**GBP/USD** — Alta volatilidade. Pode se mover rápido em qualquer direção. Melhor para traders intermediários.

**AUD/USD** — Ligado a commodities. Influenciado pelos preços do ouro e do petróleo.

## Força das Moedas

:::key
Moedas com juros mais altos tendem a atrair compradores (USD, GBP, AUD), enquanto as moedas consideradas porto seguro (JPY, CHF) se fortalecem em momentos de aversão ao risco (risk-off).
:::

## Dica para Iniciantes

:::tip
Comece com 1 ou 2 pares. USD/JPY ou EUR/USD são ideais para aprender. Evite acompanhar muitos pares ao mesmo tempo — o foco é fundamental no início.
:::$pt$,
       content_es = $es$Los pares de divisas son la base de la negociación en el FX. Muestran qué divisa compras y cuál vendes.

## Cómo Leer los Pares de Divisas

:::diagram:currency_flow:::

EUR/USD = 1.0850 significa:
- **Izquierda (EUR)** = `Divisa Base` (Base Currency)
- **Derecha (USD)** = `Divisa de Cotización` (Quote Currency)
- **1.0850** = 1 euro cuesta 1,0850 dólares

:::tip
Precio subiendo = la divisa base se está fortaleciendo. Precio bajando = la divisa base se está debilitando.
:::

## Pares Principales (Majors)

**EUR/USD** — El par más negociado del mundo. Forma tendencias bien definidas durante las sesiones de Londres y Nueva York.

**USD/JPY** — Popular entre los traders asiáticos. Relativamente estable, bueno para principiantes.

**GBP/USD** — Alta volatilidad. Puede moverse rápido en cualquier dirección. Mejor para traders intermedios.

**AUD/USD** — Ligado a las materias primas. Influenciado por los precios del oro y del petróleo.

## Fuerza de las Divisas

:::key
Las divisas con tasas de interés más altas tienden a atraer compradores (USD, GBP, AUD), mientras que las divisas consideradas refugio seguro (JPY, CHF) se fortalecen en momentos de aversión al riesgo (risk-off).
:::

## Consejo para Principiantes

:::tip
Empieza con 1 o 2 pares. USD/JPY o EUR/USD son ideales para aprender. Evita seguir demasiados pares a la vez — el enfoque es clave al comenzar.
:::$es$
 where title_en = 'How Currency Pairs Work';

-- ============================================================================
-- FX Basics: Pips and Lots
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$`Pips` e `lotes` são unidades essenciais para medir lucros e o tamanho das operações no FX.

## O que é um Pip?

Um pip é o menor movimento de preço padrão em um par de moedas.

:::diagram:pip_calculation:::

**Maioria dos pares**: a 4ª casa decimal
- EUR/USD: 1.0850 → 1.0851 = **1 pip**

**Pares com JPY**: a 2ª casa decimal
- USD/JPY: 150.00 → 150.01 = **1 pip**

:::tip
Os pips medem a qualidade da operação independentemente do tamanho da posição. Um trader que captura 100 pips fez uma operação igualmente boa, tenha usado 0,01 ou 10 lotes.
:::

## O que é um Lote?

Um lote é a unidade de tamanho da operação.

:::diagram:lot_size:::

## Cálculo do Lucro

:::example
Compre USD/JPY com 0,1 lote e o preço sobe 20 pips:
0,1 lote × 20 pips × ~US$ 1/pip = ~US$ 20 de lucro
:::

## Tamanho de Lote para Iniciantes

:::warning
Com US$ 1.000 de capital, comece com 0,01–0,05 lotes. Nunca arrisque mais de 2% da sua conta em uma única operação.
:::

:::key
Lotes pequenos são seu escudo enquanto você aprende. Comece pequeno e aumente apenas depois de encontrar seus padrões vencedores.
:::$pt$,
       content_es = $es$`Pips` y `lotes` son unidades esenciales para medir las ganancias y el tamaño de las operaciones en el FX.

## ¿Qué es un Pip?

Un pip es el menor movimiento de precio estándar en un par de divisas.

:::diagram:pip_calculation:::

**Mayoría de los pares**: el 4º decimal
- EUR/USD: 1.0850 → 1.0851 = **1 pip**

**Pares con JPY**: el 2º decimal
- USD/JPY: 150.00 → 150.01 = **1 pip**

:::tip
Los pips miden la calidad de la operación sin importar el tamaño de la posición. Un trader que captura 100 pips hizo una operación igual de buena, ya sea que haya usado 0,01 o 10 lotes.
:::

## ¿Qué es un Lote?

Un lote es la unidad de tamaño de la operación.

:::diagram:lot_size:::

## Cálculo de la Ganancia

:::example
Compra USD/JPY con 0,1 lote y el precio sube 20 pips:
0,1 lote × 20 pips × ~US$ 1/pip = ~US$ 20 de ganancia
:::

## Tamaño de Lote para Principiantes

:::warning
Con US$ 1.000 de capital, empieza con 0,01–0,05 lotes. Nunca arriesgues más del 2% de tu cuenta en una sola operación.
:::

:::key
Los lotes pequeños son tu escudo mientras aprendes. Empieza pequeño y aumenta solo después de encontrar tus patrones ganadores.
:::$es$
 where title_en = 'Pips and Lots';

-- ============================================================================
-- FX Basics: Order Types
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$O FX oferece vários tipos de ordens. Usá-las de forma estratégica melhora muito o seu trading.

:::diagram:order_types:::

## Ordem a Mercado (Market Order)

Compra ou venda imediatamente ao preço atual.

:::tip
Use quando quiser execução instantânea após um sinal claro. Lembre-se de que você pode obter um preço ligeiramente diferente por causa do spread.
:::

## Ordem Limitada (Limit Order)

Executa automaticamente a um preço especificado.

- **Buy Limit**: Definida abaixo do preço atual (comprar na queda)
- **Sell Limit**: Definida acima do preço atual (vender na alta)

:::example
Use ordens limitadas para estratégias de "comprar na queda" ou "vender na alta". Não é preciso acompanhar o gráfico o tempo todo.
:::

## Ordem Stop (Stop Order)

Dispara quando o preço rompe um nível. Usada em estratégias de `breakout` (rompimento).

- **Buy Stop**: Definida acima do preço atual (comprar no rompimento)
- **Sell Stop**: Definida abaixo do preço atual (vender no rompimento para baixo)

## Stop Loss (O Mais Importante!)

:::warning
Sempre defina um stop loss em toda operação. Operar sem stop loss é apostar, não fazer trading. Ele limita suas perdas a um valor predeterminado.
:::

:::example
Compre USD/JPY a 150,00 e defina o stop em 149,70 = perda máxima de 30 pips. Mesmo que ocorra um flash crash, sua perda fica limitada.
:::

## Take Profit

Garante seus ganhos. Fecha automaticamente no seu preço-alvo.

## O Trio Essencial

:::key
Toda operação deve ter: Entrada + Stop Loss + Take Profit. Faça disso um hábito desde o primeiro dia. Até os traders profissionais nunca pulam essa etapa.
:::$pt$,
       content_es = $es$El FX ofrece varios tipos de órdenes. Usarlas de forma estratégica mejora mucho tu trading.

:::diagram:order_types:::

## Orden a Mercado (Market Order)

Compra o venta inmediatamente al precio actual.

:::tip
Úsala cuando quieras ejecución instantánea tras una señal clara. Ten en cuenta que puedes obtener un precio ligeramente diferente por el spread.
:::

## Orden Límite (Limit Order)

Se ejecuta automáticamente a un precio especificado.

- **Buy Limit**: Colocada por debajo del precio actual (comprar en la caída)
- **Sell Limit**: Colocada por encima del precio actual (vender en la subida)

:::example
Usa órdenes límite para estrategias de "comprar en la caída" o "vender en la subida". No necesitas seguir el gráfico todo el tiempo.
:::

## Orden Stop (Stop Order)

Se dispara cuando el precio rompe un nivel. Usada en estrategias de `breakout` (rompimiento).

- **Buy Stop**: Colocada por encima del precio actual (comprar en el rompimiento)
- **Sell Stop**: Colocada por debajo del precio actual (vender en el rompimiento hacia abajo)

## Stop Loss (¡El Más Importante!)

:::warning
Siempre coloca un stop loss en cada operación. Operar sin stop loss es apostar, no hacer trading. Limita tus pérdidas a una cantidad predeterminada.
:::

:::example
Compra USD/JPY a 150,00 y coloca el stop en 149,70 = pérdida máxima de 30 pips. Incluso si ocurre un flash crash, tu pérdida queda limitada.
:::

## Take Profit

Asegura tus ganancias. Cierra automáticamente en tu precio objetivo.

## El Trío Esencial

:::key
Toda operación debe tener: Entrada + Stop Loss + Take Profit. Haz de esto un hábito desde el primer día. Incluso los traders profesionales nunca se saltan esta etapa.
:::$es$
 where title_en = 'Order Types';

-- ============================================================================
-- FX Basics: Spreads and Swaps
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$`Spreads` e `swaps` são os custos da negociação no FX. Entender esses custos é essencial para a lucratividade.

## O que é um Spread?

O spread é a diferença entre o preço de compra (Ask) e o de venda (Bid). É a principal receita da corretora e o seu custo de operação.

:::diagram:spread:::

:::key
Você começa toda operação com uma perda igual ao spread. O preço precisa se mover a seu favor além do spread antes de você lucrar.
:::

## Spreads Típicos

- **EUR/USD**: 0,3–1,0 pips
- **USD/JPY**: 0,2–1,0 pips
- **GBP/USD**: 0,6–2,0 pips

:::warning
Os spreads não são fixos. Eles se alargam em períodos de baixa liquidez (de madrugada), perto de grandes anúncios econômicos e durante os feriados.
:::

## Scalping e Spreads

:::example
Para scalpers que buscam alguns pips por operação, o impacto do spread é enorme. Uma diferença de 0,3 vs 1,0 pips ao longo de 100 operações = 70 pips perdidos para os spreads.
:::

## O que é um Swap?

Os swaps são encargos de juros overnight baseados no `diferencial de taxas de juros` entre as duas moedas.

- **Swap positivo**: Você recebe ao comprar a moeda de juros mais altos
- **Swap negativo**: Você paga ao comprar a moeda de juros mais baixos

:::tip
Os swaps de quarta-feira são triplos (cobrindo sábado e domingo). Day traders raramente se preocupam com swaps, mas swing traders devem considerá-los.
:::

## Minimizando os Custos

1. Opere durante as sessões ativas (sobreposição Londres–NY)
2. Evite operar perto de grandes divulgações de notícias
3. Fique atento a swaps negativos em posições de longo prazo
4. Sempre verifique os spreads atuais antes de entrar$pt$,
       content_es = $es$`Spreads` y `swaps` son los costos de la negociación en el FX. Entender estos costos es esencial para la rentabilidad.

## ¿Qué es un Spread?

El spread es la diferencia entre el precio de compra (Ask) y el de venta (Bid). Es el principal ingreso del bróker y tu costo de operación.

:::diagram:spread:::

:::key
Empiezas toda operación con una pérdida igual al spread. El precio debe moverse a tu favor más allá del spread antes de que obtengas ganancia.
:::

## Spreads Típicos

- **EUR/USD**: 0,3–1,0 pips
- **USD/JPY**: 0,2–1,0 pips
- **GBP/USD**: 0,6–2,0 pips

:::warning
Los spreads no son fijos. Se amplían en periodos de baja liquidez (de madrugada), cerca de grandes anuncios económicos y durante los feriados.
:::

## Scalping y Spreads

:::example
Para los scalpers que buscan unos pocos pips por operación, el impacto del spread es enorme. Una diferencia de 0,3 vs 1,0 pips a lo largo de 100 operaciones = 70 pips perdidos por los spreads.
:::

## ¿Qué es un Swap?

Los swaps son cargos de interés overnight basados en el `diferencial de tasas de interés` entre las dos divisas.

- **Swap positivo**: Recibes al comprar la divisa de tasas más altas
- **Swap negativo**: Pagas al comprar la divisa de tasas más bajas

:::tip
Los swaps del miércoles son triples (cubren sábado y domingo). Los day traders rara vez se preocupan por los swaps, pero los swing traders deben tenerlos en cuenta.
:::

## Minimizando los Costos

1. Opera durante las sesiones activas (superposición Londres–NY)
2. Evita operar cerca de grandes publicaciones de noticias
3. Presta atención a los swaps negativos en posiciones de largo plazo
4. Siempre verifica los spreads actuales antes de entrar$es$
 where title_en = 'Spreads and Swaps';

-- ============================================================================
-- Technical Analysis: Complete Candlestick Guide
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$Os candlesticks (velas) são a ferramenta de análise gráfica mais fundamental. Cada vela conta uma história sobre a batalha entre compradores e vendedores.

## Estrutura do Candlestick

:::diagram:candlestick:::

Cada vela tem quatro preços: Abertura (Open), Máxima (High), Mínima (Low) e Fechamento (Close).

**Alta (verde/branca)**: Fechamento > Abertura — os compradores venceram
**Baixa (vermelha/preta)**: Fechamento < Abertura — os vendedores venceram

## Padrões Principais de Vela Única

**Marubozu** — Corpo longo, sem sombras. Forte momentum.

**Pin Bar** — Corpo pequeno, sombra longa. Sinal de reversão na direção oposta à sombra longa.

:::tip
Pin bar com sombra inferior longa = sinal de reversão de alta. Pin bar com sombra superior longa = sinal de reversão de baixa.
:::

**Doji** — Abertura e fechamento quase iguais. Indecisão, possível reversão.

## Padrões Principais de Múltiplas Velas

**Engolfo (Engulfing)** — A segunda vela engolfa completamente a primeira.

:::key
Engolfo de alta: vela de baixa seguida por uma vela de alta maior → reversão para cima. Mais confiável quando aparece em níveis de suporte/resistência.
:::

**Estrela da Manhã / Estrela da Noite (Morning Star / Evening Star)** — Padrões de reversão de três velas em fundos e topos.

## Dicas

:::warning
Nunca opere com base em um único padrão isolado. Sempre verifique ONDE ele apareceu (contexto) e a direção do tempo gráfico maior.
:::

1. O contexto importa mais do que o padrão em si
2. Tempos gráficos maiores dão sinais mais confiáveis
3. Combine com outros indicadores para confirmação$pt$,
       content_es = $es$Los candlesticks (velas) son la herramienta de análisis gráfico más fundamental. Cada vela cuenta una historia sobre la batalla entre compradores y vendedores.

## Estructura del Candlestick

:::diagram:candlestick:::

Cada vela tiene cuatro precios: Apertura (Open), Máximo (High), Mínimo (Low) y Cierre (Close).

**Alcista (verde/blanca)**: Cierre > Apertura — ganaron los compradores
**Bajista (roja/negra)**: Cierre < Apertura — ganaron los vendedores

## Patrones Principales de Vela Única

**Marubozu** — Cuerpo largo, sin mechas. Fuerte momentum.

**Pin Bar** — Cuerpo pequeño, mecha larga. Señal de reversión en la dirección opuesta a la mecha larga.

:::tip
Pin bar con mecha inferior larga = señal de reversión alcista. Pin bar con mecha superior larga = señal de reversión bajista.
:::

**Doji** — Apertura y cierre casi iguales. Indecisión, posible reversión.

## Patrones Principales de Múltiples Velas

**Envolvente (Engulfing)** — La segunda vela envuelve completamente a la primera.

:::key
Envolvente alcista: vela bajista seguida por una vela alcista mayor → reversión hacia arriba. Más confiable cuando aparece en niveles de soporte/resistencia.
:::

**Estrella de la Mañana / Estrella de la Noche (Morning Star / Evening Star)** — Patrones de reversión de tres velas en suelos y techos.

## Consejos

:::warning
Nunca operes basándote en un solo patrón aislado. Siempre verifica DÓNDE apareció (contexto) y la dirección del marco temporal mayor.
:::

1. El contexto importa más que el patrón en sí
2. Los marcos temporales mayores dan señales más confiables
3. Combina con otros indicadores para confirmación$es$
 where title_en = 'Complete Candlestick Guide';

-- ============================================================================
-- Technical Analysis: Support & Resistance in Practice
-- ============================================================================

update public.school_lessons
   set content_pt = $pt$`Suporte` e `resistência` são a base da análise técnica.

:::diagram:support_resistance:::

## Suporte

Um nível de preço onde a pressão compradora tende a surgir, impedindo novas quedas. São preços onde os compradores entraram várias vezes antes.

## Resistência

Um nível de preço onde a pressão vendedora tende a surgir, impedindo novas altas. São preços onde os vendedores entraram antes.

## Como Desenhar

1. Use gráficos diários ou de 4 horas
2. Encontre níveis onde o preço reagiu pelo menos duas vezes
3. Pense em zonas, não em linhas exatas
4. Mais toques = nível mais forte

:::key
Suporte e resistência são ZONAS, não linhas exatas. Sempre há uma margem de alguns pips, então pense em faixas em vez de preços precisos.
:::

## Inversão de Papéis (Role Reversal)

:::tip
Um dos conceitos mais importantes: quando o suporte é rompido, ele se torna resistência (e vice-versa).
:::

:::example
USD/JPY 150,00 era suporte, mas foi rompido para baixo → na próxima vez que o preço voltar a 150,00, ele atua como resistência, com os vendedores entrando. Isso é chamado de "inversão de papéis".
:::

## Entrada Prática

**Comprar no suporte**: Espere por um padrão de vela de reversão + coloque o stop abaixo da zona.
**Vender na resistência**: Espere por um padrão de vela de reversão + coloque o stop acima da zona.

## Erros Comuns

:::warning
Não desenhe linhas demais. Foque apenas nos níveis mais significativos. Linhas com apenas um toque não são confiáveis.
:::$pt$,
       content_es = $es$`Soporte` y `resistencia` son la base del análisis técnico.

:::diagram:support_resistance:::

## Soporte

Un nivel de precio donde la presión compradora tiende a surgir, impidiendo nuevas caídas. Son precios donde los compradores han entrado varias veces antes.

## Resistencia

Un nivel de precio donde la presión vendedora tiende a surgir, impidiendo nuevas subidas. Son precios donde los vendedores han entrado antes.

## Cómo Trazar

1. Usa gráficos diarios o de 4 horas
2. Encuentra niveles donde el precio reaccionó al menos dos veces
3. Piensa en zonas, no en líneas exactas
4. Más toques = nivel más fuerte

:::key
El soporte y la resistencia son ZONAS, no líneas exactas. Siempre hay un margen de algunos pips, así que piensa en bandas en lugar de precios precisos.
:::

## Inversión de Roles (Role Reversal)

:::tip
Uno de los conceptos más importantes: cuando se rompe el soporte, se convierte en resistencia (y viceversa).
:::

:::example
USD/JPY 150,00 era soporte, pero se rompió hacia abajo → la próxima vez que el precio regrese a 150,00, actúa como resistencia, con los vendedores entrando. Esto se llama "inversión de roles".
:::

## Entrada Práctica

**Comprar en el soporte**: Espera un patrón de vela de reversión + coloca el stop debajo de la zona.
**Vender en la resistencia**: Espera un patrón de vela de reversión + coloca el stop encima de la zona.

## Errores Comunes

:::warning
No traces demasiadas líneas. Enfócate solo en los niveles más significativos. Las líneas con un solo toque no son confiables.
:::$es$
 where title_en = 'Support & Resistance in Practice';
