-- 緊急セキュリティ修正: Supabase RLS設定
-- このスクリプトをSupabase SQL Editorで実行してください

-- 1. 既存のRLSポリシーを全て削除（安全のため）
DROP POLICY IF EXISTS "Users can only access their own models" ON models;
DROP POLICY IF EXISTS "Admins can access all models" ON models;
DROP POLICY IF EXISTS "Users can only access their own monthly data" ON monthly_data;
DROP POLICY IF EXISTS "Admins can access all monthly data" ON monthly_data;
DROP POLICY IF EXISTS "Users can access their own profile" ON users;
DROP POLICY IF EXISTS "Admins can access all user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- 2. テーブル構造の確認・修正
-- usersテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  subscription JSONB DEFAULT '{"plan": "basic", "status": "active", "expiresAt": "2025-12-31T23:59:59.999Z"}'::jsonb
);

-- modelsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_main_model BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- monthly_dataテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  data JSONB NOT NULL,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id, year, month)
);

-- 3. RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;

-- 4. 厳格なRLSポリシーを作成

-- usersテーブルのポリシー
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);

-- modelsテーブルのポリシー
CREATE POLICY "models_select_own" ON models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "models_insert_own" ON models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "models_update_own" ON models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "models_delete_own" ON models
  FOR DELETE USING (auth.uid() = user_id);

-- monthly_dataテーブルのポリシー
CREATE POLICY "monthly_data_select_own" ON monthly_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "monthly_data_insert_own" ON monthly_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "monthly_data_update_own" ON monthly_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "monthly_data_delete_own" ON monthly_data
  FOR DELETE USING (auth.uid() = user_id);

-- 5. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_id ON monthly_data(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_model_id ON monthly_data(model_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_model ON monthly_data(user_id, model_id);

-- 6. 既存データのクリーンアップ（必要に応じて）
-- 注意: この部分は既存データを削除します。本番環境では慎重に実行してください
-- DELETE FROM monthly_data WHERE user_id IS NULL;
-- DELETE FROM models WHERE user_id IS NULL;

-- 7. 設定確認クエリ
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users')
ORDER BY tablename;

-- 8. ポリシー確認クエリ
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
