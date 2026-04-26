-- TradeLog: trades に image_urls 追加 + trade-images Storage バケット
--
-- 取引ごとにチャート画像を最大数枚添付できる。
-- 共有取引では sync_post_for_trade トリガーで posts.image_urls にも反映。
--
-- このマイグレーションは idempotent

-- ============================================================================
-- 1. trades.image_urls カラム追加
-- ============================================================================

alter table public.trades
  add column if not exists image_urls text[] not null default '{}'::text[];

comment on column public.trades.image_urls is 'チャート画像のURL配列（最大4枚程度想定）';

-- ============================================================================
-- 2. sync_post_for_trade で image_urls もコピー
-- ============================================================================

create or replace function public.sync_post_for_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.is_shared = true)
     or (tg_op = 'UPDATE' and new.is_shared = true and (old.is_shared is distinct from true)) then
    insert into public.posts (user_id, trade_id, post_type, content, hashtags, image_urls)
    values (
      new.user_id,
      new.id,
      'trade_result',
      coalesce(new.memo, ''),
      public.extract_hashtags(new.memo),
      coalesce(new.image_urls, '{}'::text[])
    )
    on conflict do nothing;
  end if;

  if tg_op = 'UPDATE' and new.is_shared = true and old.is_shared = true
     and (new.memo is distinct from old.memo or new.image_urls is distinct from old.image_urls) then
    update public.posts
       set content = coalesce(new.memo, ''),
           hashtags = public.extract_hashtags(new.memo),
           image_urls = coalesce(new.image_urls, '{}'::text[])
     where trade_id = new.id;
  end if;

  if tg_op = 'UPDATE' and new.is_shared = false and old.is_shared = true then
    delete from public.posts where trade_id = new.id;
  end if;

  return new;
end;
$$;

-- 既存の共有取引について image_urls をバックフィル
update public.posts p
   set image_urls = coalesce(t.image_urls, '{}'::text[])
  from public.trades t
 where p.trade_id = t.id;

-- ============================================================================
-- 3. trade-images Storage バケット
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', true)
on conflict (id) do nothing;

drop policy if exists "trade_images_public_read"  on storage.objects;
drop policy if exists "trade_images_owner_insert" on storage.objects;
drop policy if exists "trade_images_owner_update" on storage.objects;
drop policy if exists "trade_images_owner_delete" on storage.objects;

-- 全員 read 可（共有された取引画像は公開）
create policy "trade_images_public_read"
  on storage.objects for select
  using (bucket_id = 'trade-images');

create policy "trade_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trade_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trade_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
