-- TradeLog: 招待リワード（紹介でPremium日数を双方に付与）
--
-- profiles.referral_code       : ユーザー固有の招待コード（自動生成）
-- profiles.referred_by         : 誰に招待されたか
-- profiles.bonus_premium_until : リワードで付与されたPremium有効期限
-- referrals                    : 紹介成立の記録（招待された側1人につき1行）
-- redeem_referral(code)        : 招待コードを使う（双方に +14日 のbonus付与）
-- このマイグレーションは idempotent

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists bonus_premium_until timestamptz;

create or replace function public.gen_referral_code()
returns text language sql as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

-- 既存ユーザーへコードを backfill
update public.profiles
  set referral_code = public.gen_referral_code()
  where referral_code is null;

-- 新規ユーザーはデフォルトで採番
alter table public.profiles
  alter column referral_code set default public.gen_referral_code();

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code) where referral_code is not null;

create table if not exists public.referrals (
  id         uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- 招待コードを使う（security definer: 相手プロフィールへの付与のため RLS をバイパス）
create or replace function public.redeem_referral(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
  v_invitee uuid := auth.uid();
  v_reward_days int := 14;
begin
  if v_invitee is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select id into v_inviter from public.profiles
    where referral_code = upper(trim(code));

  if v_inviter is null then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_inviter = v_invitee then
    return json_build_object('ok', false, 'error', 'self');
  end if;

  if exists (select 1 from public.profiles where id = v_invitee and referred_by is not null)
     or exists (select 1 from public.referrals where invitee_id = v_invitee) then
    return json_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  insert into public.referrals (inviter_id, invitee_id) values (v_inviter, v_invitee);
  update public.profiles set referred_by = v_inviter where id = v_invitee;

  update public.profiles
    set bonus_premium_until =
      greatest(coalesce(bonus_premium_until, now()), now()) + (v_reward_days || ' days')::interval
    where id in (v_inviter, v_invitee);

  return json_build_object('ok', true, 'reward_days', v_reward_days);
end;
$$;

grant execute on function public.redeem_referral(text) to authenticated;
