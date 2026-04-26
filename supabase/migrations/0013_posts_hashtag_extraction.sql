-- TradeLog: trade memo からハッシュタグを抽出して posts.hashtags に保存
--
-- sync_post_for_trade トリガー関数を更新し、memo 内の #タグ を自動で配列に抽出。
-- 例: "ロンドン時間 #FX #USDJPY" → ['fx', 'usdjpy']
--
-- このマイグレーションは idempotent

-- 既存関数があれば削除（戻り値型変更に備えて）
drop function if exists public.extract_hashtags(text);

create function public.extract_hashtags(text_content text)
returns text[]
language sql
immutable
as $$
  -- regexp_matches は SETOF text[] を返す（各要素はキャプチャ配列）
  -- m[1] で最初のキャプチャ（#の後の部分）を取り出す
  -- 文字クラス:
  --   A-Za-z0-9_  : 半角英数字 + アンダースコア
  --   ぁ-ゟ        : ひらがな (Unicode 3041-309F)
  --   ゠-ヿ        : カタカナ (Unicode 30A0-30FF)
  --   一-龯        : CJK統合漢字 (Unicode 4E00-9FAF)
  select coalesce(
    array_agg(distinct lower(m[1]))
      filter (where m[1] is not null and m[1] <> ''),
    array[]::text[]
  )
  from regexp_matches(
    coalesce(text_content, ''),
    '#([A-Za-z0-9_ぁ-ゟ゠-ヿ一-龯]+)',
    'g'
  ) as t(m)
$$;

comment on function public.extract_hashtags(text) is
  'テキストからハッシュタグ（#xxx）を抽出。半角英数字 + ひらがな + カタカナ + 漢字対応';

create or replace function public.sync_post_for_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.is_shared = true)
     or (tg_op = 'UPDATE' and new.is_shared = true and (old.is_shared is distinct from true)) then
    insert into public.posts (user_id, trade_id, post_type, content, hashtags)
    values (
      new.user_id,
      new.id,
      'trade_result',
      coalesce(new.memo, ''),
      public.extract_hashtags(new.memo)
    )
    on conflict do nothing;
  end if;

  if tg_op = 'UPDATE' and new.is_shared = true and old.is_shared = true
     and new.memo is distinct from old.memo then
    update public.posts
       set content = coalesce(new.memo, ''),
           hashtags = public.extract_hashtags(new.memo)
     where trade_id = new.id;
  end if;

  if tg_op = 'UPDATE' and new.is_shared = false and old.is_shared = true then
    delete from public.posts where trade_id = new.id;
  end if;

  return new;
end;
$$;

-- 既存 posts のハッシュタグをバックフィル
update public.posts p
   set hashtags = public.extract_hashtags(t.memo)
  from public.trades t
 where p.trade_id = t.id
   and (p.hashtags is null or array_length(p.hashtags, 1) is null);

-- ハッシュタグ検索用インデックス（GIN）
create index if not exists posts_hashtags_idx
  on public.posts using gin (hashtags);

-- ハッシュタグ検索用 RPC
create or replace function public.search_posts_by_hashtag(tag text)
returns setof public.posts
language sql
stable
security definer
set search_path = public
as $$
  select * from public.posts
   where lower(tag) = any(hashtags)
   order by created_at desc
   limit 50;
$$;

grant execute on function public.search_posts_by_hashtag(text) to authenticated;
