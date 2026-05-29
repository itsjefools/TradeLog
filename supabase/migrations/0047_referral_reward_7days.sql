-- TradeLog: 招待リワードの付与日数を 14 → 7 に変更
-- redeem_referral RPC の v_reward_days を 7 にしただけ。冪等

create or replace function public.redeem_referral(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
  v_invitee uuid := auth.uid();
  v_reward_days int := 7;
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
