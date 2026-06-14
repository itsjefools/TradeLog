-- 0053: フィード共有機能の撤去
--  - 記録(trades)は「自分のプロフィールのみ」表示の非公開データに統一
--  - 既存の共有済み取引を全て非公開化（is_shared = false）
--  - フィード/プロフィール投稿タブに出ていた trade 由来の投稿(trade_result)を削除
--
-- アプリ側は記録・編集ともに is_shared を常に false で書き込むよう変更済み。
-- 既存トリガー trades_sync_post は is_shared=true の時だけ post を作るため、
-- 今後は発火しない（残置のままで無害）。
-- idempotent

-- 1) 既存の共有取引を非公開に。
--    トリガー trades_sync_post が UPDATE(false←true) で対応 post を削除する。
update public.trades
  set is_shared = false
  where is_shared = true;

-- 2) 取りこぼし防止：trade 由来の投稿(trade_result)を明示削除。
--    likes / comments / notifications は posts への FK(ON DELETE CASCADE / SET NULL)で連動。
delete from public.posts
  where post_type = 'trade_result';
