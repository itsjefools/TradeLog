-- アプリ内フィードバック (指示_25)
-- ユーザーからのバグ報告・要望・一般フィードバックを保存する。

CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'bug', 'feature', 'general', 'other'
  message TEXT NOT NULL,
  app_version TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- 本人のみ自分名義のフィードバックを挿入できる
DROP POLICY IF EXISTS "Users can insert feedback" ON app_feedback;
CREATE POLICY "Users can insert feedback" ON app_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
