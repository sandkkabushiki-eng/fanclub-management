-- Supabaseセキュリティ設定の確認スクリプト
-- このスクリプトをSupabase SQL Editorで実行して、現在の設定を確認してください

-- 1. RLS有効化状況の確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS有効'
    ELSE '❌ RLS無効 - 危険！'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users')
ORDER BY tablename;

-- 2. 現在のRLSポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('models', 'monthly_data', 'users')
ORDER BY tablename, policyname;

-- 3. テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('models', 'monthly_data', 'users')
ORDER BY table_name, ordinal_position;

-- 4. 外部キー制約の確認
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('models', 'monthly_data', 'users');

-- 5. インデックスの確認
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users')
ORDER BY tablename, indexname;

-- 6. 現在のユーザー情報の確認
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  is_active
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- 7. データ分離の確認（管理者のみ実行）
-- 注意: このクエリは管理者権限が必要です
SELECT 
  'models' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM models
UNION ALL
SELECT 
  'monthly_data' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM monthly_data;
