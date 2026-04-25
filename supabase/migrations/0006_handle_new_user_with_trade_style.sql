-- TradeLog: handle_new_user トリガーを拡張して
-- auth.users.raw_user_meta_data から trade_style を読み取って profiles に保存する
--
-- 用途: 新規登録時にトレードスタイルを auth.signUp の options.data に含めると
--       自動的にプロフィールに反映される
--
-- このマイグレーションは idempotent

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, trade_style)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'trade_style', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users 新規作成時に public.profiles に対応行を作成 (trade_style はメタデータから取得)';

-- トリガー自体は 0002 で作成済みのため再作成不要
-- （関数を create or replace するだけで反映される）
