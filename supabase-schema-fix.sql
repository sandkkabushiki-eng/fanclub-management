-- Supabaseデータベーススキーマ修正
-- 既存のテーブル構造を確認し、不足しているカラムを追加

-- 1. modelsテーブルにis_main_modelカラムを追加
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_main_model BOOLEAN DEFAULT FALSE;

-- 2. 既存のレコードを更新（必要に応じて）
UPDATE models SET is_main_model = FALSE WHERE is_main_model IS NULL;

-- 3. テーブル構造を確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'models' 
ORDER BY ordinal_position;

-- 4. 外部キー制約を確認
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('models', 'monthly_data');

-- 5. 現在のデータ状況を確認
SELECT 'models' as table_name, COUNT(*) as count FROM models
UNION ALL
SELECT 'monthly_data' as table_name, COUNT(*) as count FROM monthly_data
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;

