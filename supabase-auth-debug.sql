-- Supabase Auth設定のデバッグ用SQLスクリプト
-- このスクリプトをSupabase SQL Editorで実行してください

-- 1. auth.usersテーブルの内容を確認
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. public.usersテーブルの内容を確認
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  last_login_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. メール確認が無効化されているか確認
SELECT 
  key,
  value
FROM auth.config
WHERE key = 'MAILER_AUTOCONFIRM';

-- 4. 最近作成されたユーザーの詳細
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  pu.name,
  pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '1 hour'
ORDER BY au.created_at DESC;


