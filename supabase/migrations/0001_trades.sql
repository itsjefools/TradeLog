-- TradeLog: trades テーブル
-- 取引記録（通貨ペア・方向・価格・ロット・損益・メモ）を保存する
--
-- このマイグレーションは idempotent（何度実行しても安全）

-- ============================================================================
-- 1. ENUM 型
-- ============================================================================

do $$ begin
  create type trade_direction as enum ('long', 'short');
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 2. trades テーブル
-- ============================================================================

create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  currency_pair text not null,
  direction     trade_direction not null,
  entry_price   numeric(18, 5) not null,
  exit_price    numeric(18, 5),
  lot_size      numeric(12, 2) not null,
  pnl           numeric(18, 2),
  pnl_pips      numeric(10, 1),
  memo          text,
  traded_at     timestamptz not null default now(),
  is_shared     boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.trades is 'FX取引記録';
comment on column public.trades.currency_pair is '通貨ペア例: USD/JPY, EUR/USD';
comment on column public.trades.direction is 'long = 買い, short = 売り';
comment on column public.trades.pnl is '損益額（通貨単位はユーザーの設定による、MVPでは円想定）';
comment on column public.trades.pnl_pips is '損益pips';
comment on column public.trades.is_shared is 'true の場合フィード（posts）に共有可';

-- ============================================================================
-- 3. インデックス（よくあるクエリの高速化）
-- ============================================================================

create index if not exists trades_user_id_traded_at_idx
  on public.trades (user_id, traded_at desc);

create index if not exists trades_user_id_currency_pair_idx
  on public.trades (user_id, currency_pair);

create index if not exists trades_is_shared_idx
  on public.trades (is_shared, traded_at desc)
  where is_shared = true;

-- ============================================================================
-- 4. Row Level Security (RLS)
-- ============================================================================

alter table public.trades enable row level security;

-- 既存のポリシーがあれば一度削除して作り直す（冪等性のため）
drop policy if exists "trades_select_own"    on public.trades;
drop policy if exists "trades_select_shared" on public.trades;
drop policy if exists "trades_insert_own"    on public.trades;
drop policy if exists "trades_update_own"    on public.trades;
drop policy if exists "trades_delete_own"    on public.trades;

-- 自分の取引は全部見える
create policy "trades_select_own"
  on public.trades for select
  using (auth.uid() = user_id);

-- 他人の取引でも is_shared = true なら見える（フィード用）
create policy "trades_select_shared"
  on public.trades for select
  using (is_shared = true);

-- 自分の取引しか作れない
create policy "trades_insert_own"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- 自分の取引しか更新できない
create policy "trades_update_own"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 自分の取引しか削除できない
create policy "trades_delete_own"
  on public.trades for delete
  using (auth.uid() = user_id);
