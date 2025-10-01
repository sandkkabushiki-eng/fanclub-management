-- Supabase Auth設定のデバッグ用SQLスクリプト（修正版）
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

-- 3. 最近作成されたユーザーの詳細（auth.usersとpublic.usersの関連性）
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  pu.name,
  pu.role,
  pu.created_at as public_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;

-- 4. メール確認が必要なユーザーを確認
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 5. ログインしたことがないユーザーを確認
SELECT 
  id,
  email,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE last_sign_in_at IS NULL
ORDER BY created_at DESC;


