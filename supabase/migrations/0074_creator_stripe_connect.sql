-- 0074 作成者ペイアウト: Stripe Connect 対応
-- ============================================================================
-- creator_payout_accounts を Stripe Connect（Express）用に拡張。
-- 口座情報そのものは Stripe が保持し、自社には stripe_account_id と状態だけ持つ。
--   payouts_enabled = true で「受取可能」。details_submitted = オンボーディング提出済み。
--
-- status(既存: unverified/pending/verified/rejected) は表示用に同期する想定:
--   未開始=unverified / 提出済み未承認=pending / payouts_enabled=verified。
-- 冪等。
-- ============================================================================

alter table public.creator_payout_accounts
  add column if not exists stripe_account_id   text,
  add column if not exists payouts_enabled     boolean not null default false,
  add column if not exists details_submitted   boolean not null default false;

create index if not exists idx_creator_payout_accounts_stripe
  on public.creator_payout_accounts (stripe_account_id);
