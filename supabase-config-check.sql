-- Supabase設定確認スクリプト
-- このスクリプトをSupabase SQL Editorで実行して設定を確認してください

-- 1. usersテーブルの構造確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. usersテーブルのRLS設定確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. usersテーブルのRLSポリシー確認
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. 現在のusersテーブルのデータ確認
SELECT COUNT(*) as user_count FROM users;

-- 5. auth.usersテーブルの確認（Supabase Auth用）
SELECT COUNT(*) as auth_user_count FROM auth.users;

-- 6. 最近のauth.usersのサンプルデータ
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;




