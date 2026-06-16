-- 0063: 0058(リスク管理/心理学)+0060(実践手法)の14レッスンに英語本文(content_en)を付与。
--  これで非日本語(en/pt/es)ユーザーは英語で読める(従来は ja フォールバックで不可)。
--  pt/es ネイティブ訳は別バッチ(0064+)で補完予定。
--  title_en でマッチして UPDATE。冪等(再実行で同じ値に上書き)。

-- ===== Risk Management =====

update public.school_lessons set content_en = $en$What separates winning traders from those who blow up isn't strategy — it's risk management. No matter how good your entries are, without the skill to protect your capital you will eventually leave the market.

:::key
The first thing to master is not how to win, but how to survive. As long as you survive, your skills will improve. If you blow up, it's over.
:::

## Defense before offense

Most beginners chase "where do I buy to make money?" Professionals first ask "if I'm wrong, how much do I lose?"

- The amateur's question is `how much can I win`
- The pro's question is `how much can I lose and still survive`

This shift in perspective decisively changes long-term results.

## One big loss takes everything

Capital compounds — which is why a single large loss can be fatal.

:::warning
To recover from a 50% loss, you must grow what's left by **100%**. If 200k drops to 100k, you have to double it just to get back. The bigger the loss, the exponentially harder the recovery.
:::

## Protecting your right to keep playing the odds

Trading isn't one win or loss — it's hundreds of attempts. Even an edge loses in the short run. Surviving those streaks and preserving the capital to keep taking trades is the essence of risk management.

:::tip
Later chapters cover `risk per trade`, `position sizing`, `stop placement`, and `risk-reward`. They all serve one goal: to survive.
:::$en$
where title_en = 'Why Risk Management Comes First';

update public.school_lessons set content_en = $en$Deciding "what percent of my account can I lose on one trade" is the starting point of risk management.

:::key
**The 2% rule**: risk no more than 2% of your account on any single trade. It's a golden rule many professionals follow to survive.
:::

## Why 2%?

With a 1,000,000 account, the max loss per trade is 20,000. Keep to this and even a losing streak does limited damage.

- One loss = `capital × 2%`
- Capital shrinks only slowly through a streak
- You keep the time and the composure to recover

## Surviving a streak

:::example
With 1,000,000 and 2% risk, ten straight losses leave about 820,000 (compounded). Risk 20% per trade and just **three** losses cut you nearly in half. Same streak, completely different outcome.
:::

## Beginners go smaller

Until your discipline is trained, start at `1%` or even `0.5%`. The smaller the risk, the less a single loss rattles you, and the calmer your decisions stay.

:::warning
Betting big to "get rich fast" is the express lane to ruin. Doubling your risk doesn't just double your growth — it raises your odds of blowing up far more.
:::

## Work backwards from the loss

1. Set the loss you'll allow (e.g., 1,000,000 × 2% = `20,000`)
2. Decide your stop distance in pips
3. From those two, calculate the right position size$en$
where title_en = 'How Much to Risk Per Trade — The 2% Rule';

update public.school_lessons set content_en = $en$Most traders size positions "by feel." But the correct size is something you **calculate**. Master this and you keep risk constant in any market.

## The position-sizing formula

:::key
**Size = allowed loss ÷ (stop distance in pips × value per pip)**

Once you know "how much you can lose" and "how many pips to your stop," size is automatic.
:::

:::diagram:lot_size:::

## A worked example

:::example
1,000,000 account, 2% rule (allowed loss `20,000`), USD/JPY with a `20-pip` stop.

1 lot (100,000 units) ≈ 1,000 per pip. 20 pips × 1,000 = 20,000 loss per lot.
→ 20,000 ÷ 20,000 = **1.0 lot**.

If the stop widens to 40 pips, halve the size to 0.5 lot.
:::

## Wider stop, smaller size

This is the key point beginners get backwards:

- **Wider** stop → use a **smaller** size
- **Tighter** stop → you can use a larger size

This keeps the loss per trade constant (2% of capital) regardless of stop distance.

:::warning
Fixing your lot size is dangerous. The same 1 lot risks 5× more with a 100-pip stop than a 20-pip stop. Fix the **loss amount, not the lot**.
:::

## Make it a routine

1. Decide the stop first (from chart structure)
2. Measure the distance from entry to stop in pips
3. Back-calculate the size with the formula
4. Enter with that size$en$
where title_en = 'Position Sizing Done Right';

update public.school_lessons set content_en = $en$The stop-loss is the heart of risk management. Place it wrong and it not only fails to protect you — it amplifies your losses.

:::key
A stop is the price at which you admit your read was wrong. Decide it by **chart structure**, not emotion.
:::

:::diagram:order_types:::

## Place stops by structure

A good stop sits where "if price reaches here, my scenario is broken":

- Just beyond a recent **swing low/high**
- Where a clear **support/resistance** level breaks
- The level that invalidates your idea

A bad stop is placed by how much money you're willing to lose.

## Pips first, then size

1. Wrong: "I only want to lose 20,000, so I'll stop at 20 pips"
2. Right: "Structure says 30 pips is fair → adjust size so the loss is still 20,000"

The chart decides the stop; size controls the loss amount.

:::warning
Trading without a stop — or **moving your stop wider** as the loss grows — is the most common path to blowing up. "It'll come back" turns a small loss into a fatal one.
:::

## Don't move a stop the wrong way

You may trail a stop toward profit (to breakeven), but **never** move it in the losing direction. That one rule alone slashes your blow-up risk.$en$
where title_en = 'Making Stop-Losses Actually Work';

update public.school_lessons set content_en = $en$Chasing win rate alone won't make you profitable. What matters is the **combination** of win rate and risk-reward — and surviving the drawdowns that are guaranteed to come.

## Risk-reward (RR)

How much `reward (target)` you aim for versus your `risk (stop)`.

:::key
RR = reward ÷ risk. A 20-pip stop and 60-pip target is **RR = 3.0**. Higher RR means you stay profitable at a lower win rate.
:::

## Break-even win rate

:::example
- RR = 1.0 → break-even win rate is **50%**
- RR = 2.0 → about **33%** needed
- RR = 3.0 → only **25%** needed

At RR 3.0 you can be wrong 3 of 4 times and still win overall. Low win rate is not the same as bad.
:::

## Think in expectancy

Expectancy = (win rate × avg win) − (loss rate × avg loss). As long as it's positive, your equity trends up over enough trades. The Analytics tab's `profit factor` and `avg RR` reflect exactly this health.

## Drawdowns will come

:::warning
Even a positive-expectancy system hits 10-loss streaks. Mistaking this for "my system is broken" and abandoning it means missing the recovery. Streaks are a **feature, not a bug**.
:::

## Lower your risk of ruin

The smaller your per-trade risk, the dramatically lower your long-run risk of ruin. In the end, the survivors aren't the smartest or the highest win rate — they're the ones who **never lost big**.$en$
where title_en = 'Risk-Reward & Surviving Drawdowns';

-- ===== Trading Psychology =====

update public.school_lessons set content_en = $en$Two traders use the same strategy — one wins, one loses. A method that backtests well still loses live. The difference is psychology.

:::key
Results are often said to be 20% method, 30% money management, and 50% psychology (discipline). The last line of defense is always your mind.
:::

## Knowing and doing are different

Everyone "knows" not to chase highs and to cut losses early. Yet in real markets we do the opposite. Why?

- In profit, you `take it too early` and never let winners run
- In loss, you `can't admit it` and won't cut
- On a spike, you `fear missing out` and buy the high

These are driven by **emotion**, not knowledge.

## Loss is burned into the brain as pain

The brain feels the pain of a loss about **twice** as strongly as the joy of an equal gain (covered next chapter).

:::warning
This "avoid pain" instinct delays your stops and rushes your exits. Our brains are wired to make losses big and gains small. Winning requires training yourself against that instinct.
:::

## Discipline is a muscle for following rules

You can't erase emotion — pros feel fear and greed too. The difference is the trained ability **not to obey** them.

:::tip
Don't try to control emotion; focus on following `rules set in advance`. Decide entry, stop, target, and size while calm, then simply execute while the market moves.
:::$en$
where title_en = 'Why a Good Strategy Still Loses';

update public.school_lessons set content_en = $en$At their core, two emotions move markets: **fear** and **greed**. Understand them and your own failure patterns become obvious.

## Failures driven by greed

Greed is "I want more."

- **Buying the top**: chasing a spike for fear of missing out (FOMO)
- **Not taking profit**: "it'll go further," and the gain becomes a loss
- **Oversizing**: betting reckless size to "get rich quick"

:::example
Price spikes, social media is buzzing, you feel "I have to get in now" and buy the high. That moment is often the top. The `greed` you feel may be the exit liquidity others are selling into.
:::

## Failures driven by fear

Fear is "I don't want to lose."

- **Panic selling**: bailing before your stop on a small pullback
- **Chicken exits**: taking tiny profits for fear they vanish
- **Paralysis**: too scared to enter even a high-quality setup after a streak

:::warning
Fear drives both the right action (a planned stop) and the wrong one (panic selling). The difference is whether it was a **stop set in advance** or an in-the-moment reaction.
:::

## Emotion as a contrarian signal

Veterans use their own strong emotions as a warning light.

:::tip
If you feel "I must buy NOW!", it may be a top. If you feel "I can't bear to watch," it may be a bottom. Markets reverse when the **crowd is gripped by extreme fear or greed**.
:::

## The fix: observe your emotions

Don't suppress emotion — observe it like a third party. Notice "I'm being greedy," label it "this is FOMO," and that label creates distance. With distance, you can follow your rules.$en$
where title_en = 'Fear & Greed: The Two Market Emotions';

update public.school_lessons set content_en = $en$Why do we "let losses run and cut gains short"? The answer is **prospect theory**, which won a Nobel Prize. Understand it and your irrational behavior makes sense.

## Losses hurt about twice as much

:::key
**Loss aversion**: the pain of losing 10,000 is about twice as strong as the joy of gaining 10,000. The brain doesn't weigh gains and losses symmetrically.
:::

This asymmetry is at the root of nearly every trading mistake.

## In profit, we turn timid

:::example
"+10,000 locked in" vs. "flip a coin: heads +20,000, tails 0." Same expected value, yet most choose the sure +10,000. That's why we snatch profits — the **chicken exit**.
:::

## In loss, we turn into gamblers

:::example
"−10,000 realized" vs. "flip a coin: heads 0, tails −20,000." Again same expectancy, yet most refuse to cut and gamble. That's **bag-holding and martingale averaging**.
:::

## So the natural trader always loses

- In profit: exit early → gains shrink
- In loss: refuse to cut → losses grow

:::warning
This is prospect theory's cruel truth. Trade on instinct and your risk-reward inevitably deteriorates. You fail to secure the RR you learned about — not because of method, but because of this bias.
:::

## The fix: overwrite instinct with mechanics

1. Set **both** stop and target before entering
2. Place the stop and limit orders **at the same time**
3. Once in a position, avoid watching the screen too much

The less room for human judgment, the more loss aversion is locked out of your account.$en$
where title_en = 'Loss Aversion & Prospect Theory';

update public.school_lessons set content_en = $en$The only way to beat emotion is to not fight it. Instead, follow **rules** you made while calm. That is the essence of professional discipline.

:::key
Discipline isn't "willpower" or "endurance." It's a **system for mechanically executing rules set in advance**. Discipline that relies on willpower always breaks during a losing streak.
:::

## Five elements of a trading rule

Make your rules concrete enough to write on paper.

1. **Context**: which market conditions you'll trade
2. **Entry**: what triggers a trade (a specific signal)
3. **Stop**: where it goes (by chart structure)
4. **Target**: what RR you aim for, how you exit
5. **Size**: how you compute it with the 2% rule

:::tip
Even "discretionary" trading needs rules. Discretion isn't "no rules" — it's `judging within the rules`. Freedom without boundaries is just impulse.
:::

## A checklist stops impulse

:::example
Before entering, say it out loud: "Is context OK? Is the entry condition met? Where's the stop? Is RR ≥ 2? Did I size it?" If any answer is "no," **skip the trade**.
:::

## Not trading is discipline too

:::warning
The hardest discipline is `doing nothing when conditions aren't there`. The urge to always be in a position comes from boredom and impatience. Trading without an edge just sprays fees and losses.
:::

## Grow rules by recording when you break them

- Followed rules and won → repeatable edge
- Followed rules and lost → expected cost, review the method
- Broke rules and won → **most dangerous**; it reinforces bad habits
- Broke rules and lost → reflect and write down why you broke them$en$
where title_en = 'Building Discipline: Rule-Based Trading';

update public.school_lessons set content_en = $en$Losing streaks come for everyone. The problem isn't the streak — it's the **tilt** it triggers: losing your cool and trying to win it back emotionally. Tilt is the number one account killer.

:::key
**Tilt**: the state after losses where you lose composure and fire off reckless trades. Tilt's chain of losses destroys far more capital than any single loss.
:::

## Spot the signs of tilt

You're on tilt if:

- You feel a strong urge to **win it back**
- You're raising size, ignoring your rules
- You want to enter the instant you open a chart
- You think "the next one will make it back"

:::warning
Trading to "get it back" fails almost 100% of the time, because you're trading your **losses**, not the market. The market doesn't know or care how much you've lost.
:::

## Streaks are part of the spec

Even a positive-expectancy system hits 10-loss streaks.

:::tip
Feeling "my system is broken" or "I'm hopeless" during a streak is natural. But like flipping ten heads in a row, streaks are within **random variance**. Judge your method over `100-trade` samples, not single results.
:::

## A concrete recovery routine

1. **Stop**: end trading for the day; close the charts
2. **Step away**: walk, exercise, sleep — physical distance
3. **Write**: record why you lost and what triggered the tilt
4. **Return small**: resume at half size; scale up once confident

:::example
Pros set a **daily stop-loss** (e.g., `5% of capital`). Hit it and the day ends. It physically prevents the worst day — the one where you keep digging to win it back.
:::

## A trading journal is your best weapon

All psychological growth comes from records. Note each trade's `reason` and `emotion`, find your streak patterns, and build your own "never do this" list. This app's `Records tab` is that journal — write what you felt, and slowly conquer your biggest opponent: yourself.$en$
where title_en = 'Losing Streaks & Tilt: How to Recover';

-- ===== Practical Methods =====

update public.school_lessons set content_en = $en$Day trading means closing your positions within the day and never holding overnight. Calmer than scalping, faster than swing trading — a realistic style even for part-time traders.

:::key
The day trader's stance: ride the day's trend and always flatten by the close. The biggest benefit is taking no overnight gap risk while you sleep.
:::

## Best hours to day trade

Each pair has hours when it moves.

- **Tokyo (09:00–15:00)**: quiet, often ranging
- **London (from 16:00)**: liquidity rises, trends appear
- **New York (from 21:00)**: most active, lots of data releases

:::tip
Part-time traders can focus only on the `London–NY overlap (≈21:00–01:00)` instead of watching all day. Target the hours that actually move and you capture opportunity efficiently.
:::

## Build a plan for the day

Day trading runs on planning, not whims.

1. **Context**: check higher timeframes (4H/daily) for today's bias
2. **Scenarios**: prepare several "if price does X, I do Y" plans
3. **Execute**: enter on the rule, always set stop and target
4. **Flatten**: close everything at your end-of-day time

:::warning
Holding overnight because "it's almost in profit" isn't day trading. It's a rule violation — the dangerous `carrying an unrealized loss`.
:::

## What winning day traders share

- They cap trades per day (no overtrading)
- They set a daily max loss (daily stop)
- Win or lose, they stop at the decided time

Review your day in the `Records tab` and your best hours and pairs will reveal themselves.$en$
where title_en = 'Day Trading Basics';

update public.school_lessons set content_en = $en$Trends don't move in a straight line. Uptrends dip (pullbacks); downtrends bounce (rallies). Trading those temporary counter-moves is pullback trading.

:::key
**The classic trend trade**: instead of chasing highs, wait for a pullback in the trend's direction. Buy lower and ride the trend.
:::

:::diagram:support_resistance:::

## Why pullbacks have an edge

Chasing a spike puts your stop far away and your risk high. Waiting for a pullback means:

- A **better** entry price
- A **shorter** distance to your stop (less risk)
- Therefore an **improved risk-reward**

## Where to find the pullback

Guides for "how far it pulls back":

1. **Recent support/resistance** (prior highs/lows)
2. **Moving averages** (a touch of the 20/75 MA)
3. **Fibonacci retracement** (38.2% / 50% / 61.8%)

:::example
In an uptrend, price retraces 50% from the recent high and stalls right at the 75 MA. When the candle shows a bounce, enter, with a stop just below the recent low. That's a textbook pullback buy.
:::

## Don't catch a falling knife

The biggest trap is mistaking a trend reversal for a pullback.

:::warning
Buying because "it should bounce soon" while the drop continues isn't a pullback — it's `counter-trend averaging`. Always wait for a **bounce signal** (a lower wick, a confirmed reversal candle). Don't jump in just because price "touched" support.
:::

## Patience is the weapon

The essence of pullback trading is waiting. Even in a trend, skip it if no good pullback comes. Opportunities return endlessly. Waiting for the next pullback beats chasing highs every time.$en$
where title_en = 'Pullback Trading: Buy Dips, Sell Rallies';

update public.school_lessons set content_en = $en$After price coils in a range, breaking out of it can trigger a big move. Trading that "break" is breakout trading.

:::key
A breakout captures a "release of energy." The longer the coil, the greater the energy released on the break.
:::

## Where to target breaks

- Range **highs/lows** (clear horizontal lines)
- **Trendline** breaks
- A **triangle/pennant** resolving
- Prior day high/low, round-number levels

## Two ways to avoid fakeouts

The breakout's worst enemy is the **fakeout**: it breaks, then snaps back into your stop.

:::warning
Jumping in on a wick that briefly pokes through gets you faked out. Wait for `a candle to close beyond the level with its body` and you avoid many fakeouts.
:::

:::tip
Even safer is waiting for a **retest**: after the break, price returns to the broken level (old resistance becoming new support), and you enter on the confirmed bounce. This greatly reduces fakeouts.
:::

## Confirm momentum

Real breakouts carry momentum.

1. The breaking candle is **large (forceful)**
2. Price pushes on strongly afterward
3. It coincides with key data or active hours

:::example
USD/JPY ranges 150.00–150.50 for three days. A strong NY-session number prints and price closes its body firmly above 150.50. Stop inside the range (150.30), target the range height (50 pips) above. That's the basic form.
:::

## Breakout and pullback are two sides of one coin

Breakout trading takes the `initial break`; pullback trading takes the `retest` after it. Understand both and you'll always have a reason to enter at any point in a trend.$en$
where title_en = 'Breakout Trading';

update public.school_lessons set content_en = $en$The same pair looks completely different on a 1-minute chart versus a daily. Combining multiple timeframes — multi-timeframe (MTF) analysis — is something nearly all winning traders practice.

:::key
**The MTF golden rule**: set **direction** on the higher timeframe, time your **entry** on the lower one. Don't fight the big flow; find the best moment to join it.
:::

## Use three timeframes

Three charts with different jobs:

1. **Context (higher)**: daily / 4H → which way is the big trend
2. **Strategy (mid)**: 1H → where it might turn, build the scenario
3. **Execution (lower)**: 5/15m → pull the actual entry trigger

## See the trees and the forest

Looking only at the lower timeframe loses the big flow.

:::warning
Buying because the 5-minute "is in an uptrend" while the daily is a clear downtrend pullback is a classic losing pattern. Small lower-timeframe moves are easily swallowed by the higher-timeframe wave.
:::

## The discipline of following the higher timeframe

:::example
Daily: uptrend (the forest points "up"). 1H: a pullback nears support (scenario "buy here"). 5m: a confirmed bounce candle at support (the trigger). → All three align on "buy." That's a high-probability MTF entry.
:::

## Don't use too few or too many

About **three** timeframes is right.

- Just one → you lose the big picture
- Five or six → information overload (analysis paralysis)

:::tip
Good combos space roughly **4–6× apart**, like `daily / 1H / 5m` or `4H / 15m / 1m`. Adjacent timeframes that are too close just show you the same picture twice.
:::

Master MTF and "vague" entries disappear — every trade carries a clear reason rooted in the higher timeframe.$en$
where title_en = 'Multi-Timeframe Analysis';
