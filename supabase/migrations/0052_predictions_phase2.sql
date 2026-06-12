-- 0052: 予測 Phase 2
--  - prediction_comments テーブル（コメント機能）
--  - get_predictions を拡張（コメント数 + 著者の的中率 + 任意のユーザー絞り込み）
--  - get_prediction(id)        : 単一予測（詳細画面用）
--  - get_prediction_voters(id) : 投票者一覧（bull/bear）
--  - get_prediction_comments(id): コメント一覧
-- idempotent

-- ── コメントテーブル ──────────────────────────────
create table if not exists public.prediction_comments (
  id            uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists prediction_comments_pred_idx
  on public.prediction_comments (prediction_id, created_at);

alter table public.prediction_comments enable row level security;

drop policy if exists pcomments_select on public.prediction_comments;
create policy pcomments_select on public.prediction_comments
  for select to authenticated using (true);

drop policy if exists pcomments_insert on public.prediction_comments;
create policy pcomments_insert on public.prediction_comments
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists pcomments_delete on public.prediction_comments;
create policy pcomments_delete on public.prediction_comments
  for delete to authenticated using (user_id = auth.uid());

-- ── 一覧RPC（拡張）────────────────────────────────
-- 旧シグネチャを掃除
drop function if exists public.get_predictions(integer);
drop function if exists public.get_predictions(integer, uuid);

create or replace function public.get_predictions(
  top_n integer default 50,
  p_user uuid default null
)
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
  my_vote       text,
  comment_count bigint,
  author_win_rate numeric,
  author_resolved bigint
)
language sql
security definer
set search_path = public
as $$
  with author_stats as (
    select user_id,
      count(*) filter (where outcome <> 'open') as resolved,
      count(*) filter (where outcome = 'win') as wins
    from public.predictions
    group by user_id
  ),
  comment_counts as (
    select prediction_id, count(*) as cnt
    from public.prediction_comments
    group by prediction_id
  )
  select
    pr.id, pr.user_id, p.username, p.display_name, p.avatar_url, p.is_verified,
    pr.currency_pair, pr.direction, pr.entry_price, pr.target_price, pr.stop_price,
    pr.rationale, pr.expires_at, pr.outcome, pr.created_at,
    count(*) filter (where v.vote = 'bull') as bull_count,
    count(*) filter (where v.vote = 'bear') as bear_count,
    max(v.vote) filter (where v.user_id = auth.uid()) as my_vote,
    coalesce(cc.cnt, 0) as comment_count,
    case when ast.resolved > 0
      then round(ast.wins::numeric / ast.resolved * 100)
      else null end as author_win_rate,
    coalesce(ast.resolved, 0) as author_resolved
  from public.predictions pr
  join public.profiles p on p.id = pr.user_id
  left join public.prediction_votes v on v.prediction_id = pr.id
  left join author_stats ast on ast.user_id = pr.user_id
  left join comment_counts cc on cc.prediction_id = pr.id
  where p_user is null or pr.user_id = p_user
  group by pr.id, p.username, p.display_name, p.avatar_url, p.is_verified,
           cc.cnt, ast.resolved, ast.wins
  order by pr.created_at desc
  limit top_n;
$$;

grant execute on function public.get_predictions(integer, uuid) to authenticated;

-- ── 単一予測（詳細画面） ──────────────────────────
drop function if exists public.get_prediction(uuid);
create or replace function public.get_prediction(p_id uuid)
returns table (
  id uuid, user_id uuid, username text, display_name text, avatar_url text,
  is_verified boolean, currency_pair text, direction text, entry_price numeric,
  target_price numeric, stop_price numeric, rationale text, expires_at timestamptz,
  outcome text, created_at timestamptz, bull_count bigint, bear_count bigint,
  my_vote text, comment_count bigint, author_win_rate numeric, author_resolved bigint
)
language sql security definer set search_path = public as $$
  with author_stats as (
    select user_id,
      count(*) filter (where outcome <> 'open') as resolved,
      count(*) filter (where outcome = 'win') as wins
    from public.predictions group by user_id
  ),
  comment_counts as (
    select prediction_id, count(*) as cnt
    from public.prediction_comments group by prediction_id
  )
  select
    pr.id, pr.user_id, p.username, p.display_name, p.avatar_url, p.is_verified,
    pr.currency_pair, pr.direction, pr.entry_price, pr.target_price, pr.stop_price,
    pr.rationale, pr.expires_at, pr.outcome, pr.created_at,
    count(*) filter (where v.vote = 'bull') as bull_count,
    count(*) filter (where v.vote = 'bear') as bear_count,
    max(v.vote) filter (where v.user_id = auth.uid()) as my_vote,
    coalesce(cc.cnt, 0) as comment_count,
    case when ast.resolved > 0
      then round(ast.wins::numeric / ast.resolved * 100) else null end as author_win_rate,
    coalesce(ast.resolved, 0) as author_resolved
  from public.predictions pr
  join public.profiles p on p.id = pr.user_id
  left join public.prediction_votes v on v.prediction_id = pr.id
  left join author_stats ast on ast.user_id = pr.user_id
  left join comment_counts cc on cc.prediction_id = pr.id
  where pr.id = p_id
  group by pr.id, p.username, p.display_name, p.avatar_url, p.is_verified,
           cc.cnt, ast.resolved, ast.wins;
$$;
grant execute on function public.get_prediction(uuid) to authenticated;

-- ── 投票者一覧 ────────────────────────────────────
drop function if exists public.get_prediction_voters(uuid);
create or replace function public.get_prediction_voters(p_id uuid)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  is_verified boolean, vote text, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select v.user_id, p.username, p.display_name, p.avatar_url, p.is_verified,
         v.vote, v.created_at
  from public.prediction_votes v
  join public.profiles p on p.id = v.user_id
  where v.prediction_id = p_id
  order by v.created_at desc;
$$;
grant execute on function public.get_prediction_voters(uuid) to authenticated;

-- ── コメント一覧 ──────────────────────────────────
drop function if exists public.get_prediction_comments(uuid);
create or replace function public.get_prediction_comments(p_id uuid)
returns table (
  id uuid, user_id uuid, username text, display_name text, avatar_url text,
  is_verified boolean, content text, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select co.id, co.user_id, p.username, p.display_name, p.avatar_url, p.is_verified,
         co.content, co.created_at
  from public.prediction_comments co
  join public.profiles p on p.id = co.user_id
  where co.prediction_id = p_id
  order by co.created_at asc;
$$;
grant execute on function public.get_prediction_comments(uuid) to authenticated;
