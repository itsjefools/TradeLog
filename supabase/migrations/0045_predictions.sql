-- TradeLog: 予想投稿・投票（セットアップ予想 + bull/bear 投票）
--
-- predictions      : ユーザーの相場予想（通貨ペア/方向/価格/根拠/期限/結果）
-- prediction_votes : 各予想への bull/bear 投票（1人1票・upsertで変更可）
-- get_predictions  : 一覧用RPC（著者プロフィール + 投票集計 + 自分の投票）
-- このマイグレーションは idempotent

create table if not exists public.predictions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  currency_pair text not null,
  direction    text not null check (direction in ('long', 'short')),
  entry_price  numeric,
  target_price numeric,
  stop_price   numeric,
  rationale    text,
  expires_at   timestamptz,
  outcome      text not null default 'open' check (outcome in ('open', 'win', 'loss')),
  created_at   timestamptz not null default now()
);

create index if not exists predictions_created_idx on public.predictions (created_at desc);
create index if not exists predictions_user_idx on public.predictions (user_id);

create table if not exists public.prediction_votes (
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  vote          text not null check (vote in ('bull', 'bear')),
  created_at    timestamptz not null default now(),
  primary key (prediction_id, user_id)
);

alter table public.predictions enable row level security;
alter table public.prediction_votes enable row level security;

-- predictions: 全員閲覧可・本人のみ作成/更新/削除
drop policy if exists predictions_select on public.predictions;
create policy predictions_select on public.predictions
  for select to authenticated using (true);

drop policy if exists predictions_insert on public.predictions;
create policy predictions_insert on public.predictions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists predictions_update on public.predictions;
create policy predictions_update on public.predictions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists predictions_delete on public.predictions;
create policy predictions_delete on public.predictions
  for delete to authenticated using (user_id = auth.uid());

-- votes: 全員閲覧可・本人の票のみ操作
drop policy if exists pvotes_select on public.prediction_votes;
create policy pvotes_select on public.prediction_votes
  for select to authenticated using (true);

drop policy if exists pvotes_insert on public.prediction_votes;
create policy pvotes_insert on public.prediction_votes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists pvotes_update on public.prediction_votes;
create policy pvotes_update on public.prediction_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists pvotes_delete on public.prediction_votes;
create policy pvotes_delete on public.prediction_votes
  for delete to authenticated using (user_id = auth.uid());

-- 一覧RPC: 予想 + 著者 + 投票集計 + 自分の投票
drop function if exists public.get_predictions(integer);
create or replace function public.get_predictions(top_n integer default 50)
returns table (
  id            uuid,
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  is_verified   boolean,
  currency_pair text,
  direction     text,
  entry_price   numeric,
  target_price  numeric,
  stop_price    numeric,
  rationale     text,
  expires_at    timestamptz,
  outcome       text,
  created_at    timestamptz,
  bull_count    bigint,
  bear_count    bigint,
  my_vote       text
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id, pr.user_id, p.username, p.display_name, p.avatar_url, p.is_verified,
    pr.currency_pair, pr.direction, pr.entry_price, pr.target_price, pr.stop_price,
    pr.rationale, pr.expires_at, pr.outcome, pr.created_at,
    count(*) filter (where v.vote = 'bull') as bull_count,
    count(*) filter (where v.vote = 'bear') as bear_count,
    max(v.vote) filter (where v.user_id = auth.uid()) as my_vote
  from public.predictions pr
  join public.profiles p on p.id = pr.user_id
  left join public.prediction_votes v on v.prediction_id = pr.id
  group by pr.id, p.username, p.display_name, p.avatar_url, p.is_verified
  order by pr.created_at desc
  limit top_n;
$$;

grant execute on function public.get_predictions(integer) to authenticated;
