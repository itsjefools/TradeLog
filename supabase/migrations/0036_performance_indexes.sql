-- パフォーマンス最適化用インデックス (指示_26)
-- 実テーブル名に合わせている (likes / trades / user_lesson_progress)。

-- フィード取得 (新着順 / ユーザー別)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- いいね検索 (post_id + user_id)
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post_id, user_id);

-- コメント取得 (投稿ごと新着順)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);

-- フォロー関係
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 取引記録 (ユーザー別 約定日時順)
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, traded_at DESC);

-- 通知 (ユーザー別新着順 / 未読のみ)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- レッスン進捗
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON user_lesson_progress(user_id);
