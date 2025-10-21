-- modelsテーブルにis_main_modelカラムを追加

-- is_main_modelカラムを追加（既に存在する場合はエラーを無視）
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS is_main_model BOOLEAN DEFAULT FALSE;

-- コメントを追加
COMMENT ON COLUMN models.is_main_model IS 'メインモデルフラグ（1つのユーザーにつき1つのみtrue）';

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_models_is_main_model ON models(user_id, is_main_model) WHERE is_main_model = TRUE;

