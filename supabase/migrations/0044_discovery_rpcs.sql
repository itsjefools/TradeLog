-- TradeLog: 発見・急上昇フィード用 RPC
--
-- get_trending_traders : 直近 days 日でフォロワー増・投稿エンゲージの高いユーザー
-- get_trending_hashtags: 直近 days 日で使用回数の多いハッシュタグ
--
-- いずれも security definer。公開プロフィール情報と集計のみ返す。
-- このマイグレーションは idempotent

drop function if exists public.get_trending_traders(integer, integer);
create or replace function public.get_trending_traders(
  days integer default 7,
  top_n integer default 20
)
returns table (
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  nationality   text,
  is_verified   boolean,
  trade_style   text,
  new_followers bigint,
  score         numeric
)
language sql
security definer
set search_path = public
as $$
  with fol as (
    select following_id as uid, count(*) as nf
    from public.follows
    where created_at >= now() - (days * interval '1 day')
    group by following_id
  ),
  eng as (
    select user_id as uid, coalesce(sum(likes_count + comments_count), 0) as e
    from public.posts
    where created_at >= now() - (days * interval '1 day')
    group by user_id
  ),
  agg as (
    select
      p.id as uid,
      coalesce(f.nf, 0) as nf,
      (coalesce(f.nf, 0) * 3 + coalesce(e.e, 0))::numeric as score
    from public.profiles p
    left join fol f on f.uid = p.id
    left join eng e on e.uid = p.id
  )
  select
    p.id, p.username, p.display_name, p.avatar_url, p.nationality,
    p.is_verified, p.trade_style, a.nf as new_followers, a.score
  from agg a
  join public.profiles p on p.id = a.uid
  where a.score > 0 and p.id <> auth.uid()
  order by a.score desc, a.nf desc
  limit top_n;
$$;

comment on function public.get_trending_traders(integer, integer) is
  '急上昇トレーダー（直近days日のフォロワー増+投稿エンゲージ）';

grant execute on function public.get_trending_traders(integer, integer) to authenticated;

drop function if exists public.get_trending_hashtags(integer, integer);
create or replace function public.get_trending_hashtags(
  days integer default 7,
  top_n integer default 20
)
returns table (
  tag  text,
  uses bigint
)
language sql
security definer
set search_path = public
as $$
  select lower(h) as tag, count(*) as uses
  from public.posts p, unnest(p.hashtags) as h
  where p.created_at >= now() - (days * interval '1 day')
    and p.hashtags is not null
    and length(trim(h)) > 0
  group by lower(h)
  order by uses desc, tag asc
  limit top_n;
$$;

comment on function public.get_trending_hashtags(integer, integer) is
  'トレンドハッシュタグ（直近days日の使用回数）';

grant execute on function public.get_trending_hashtags(integer, integer) to authenticated;
