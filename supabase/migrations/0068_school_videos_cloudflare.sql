-- 0068 Premium動画 (Cloudflare Stream) 対応
-- ============================================================================
-- 目的: NewsPicks型の「アプリ限定・有料会員のみ視聴できる動画」を実現するため、
--       school_videos に動画ソース種別と Cloudflare Stream の参照を追加する。
--
--   video_source = 'youtube'    … 無料動画（基礎知識）。従来どおり youtube_video_id を使う。
--   video_source = 'cloudflare' … Premium動画。Cloudflare Stream に非公開アップロードし、
--                                 stream_uid（動画UID）で参照。再生は Edge Function 経由で
--                                 有料会員にだけ署名付きトークンを発行する（YouTubeのように
--                                 リンクが漏れて無料視聴される事故を防ぐ）。
--
-- 冪等。既存の無料動画は video_source='youtube' のまま影響なし。
-- ============================================================================

alter table public.school_videos
  add column if not exists video_source text not null default 'youtube',
  add column if not exists stream_uid text;

-- youtube_video_id を nullable に（Cloudflare動画は YouTube ID を持たない）
alter table public.school_videos
  alter column youtube_video_id drop not null;

-- 動画ソース種別の制約
alter table public.school_videos
  drop constraint if exists school_videos_source_chk;
alter table public.school_videos
  add constraint school_videos_source_chk
  check (video_source in ('youtube', 'cloudflare'));

-- ソースごとに必要な参照が入っていることを保証（データ不整合の防止）
alter table public.school_videos
  drop constraint if exists school_videos_source_ref_chk;
alter table public.school_videos
  add constraint school_videos_source_ref_chk
  check (
    (video_source = 'youtube'    and youtube_video_id is not null) or
    (video_source = 'cloudflare' and stream_uid is not null)
  );

-- 補足:
--  ・Premium動画は is_free=false を必ず設定する（クライアントの会員ゲートと一致させる）。
--  ・Cloudflare 側で各動画の「Require signed URLs」を ON にしておくこと（必須）。
--  ・サムネは thumbnail_url に Cloudflare のサムネURLを入れてもよい（任意）。
