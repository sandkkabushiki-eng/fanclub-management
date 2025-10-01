-- usersテーブルの修正スクリプト
-- このスクリプトをSupabase SQL Editorで実行してください

-- 1. 既存のusersテーブルのRLSポリシーを削除（エラーを避けるため）
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- 2. usersテーブルの構造を確認・修正
-- テーブルが存在しない場合は作成
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

-- 3. usersテーブルにRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. usersテーブルのRLSポリシーを作成
-- ユーザーは自分のデータのみ表示可能
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 管理者は全ユーザーのデータを表示可能
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ユーザーは自分のデータのみ挿入可能
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 管理者はユーザーデータを挿入可能
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ユーザーは自分のデータのみ更新可能
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 管理者は全ユーザーのデータを更新可能
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. 管理者ユーザーを作成（既存でない場合）
INSERT INTO users (id, email, name, role, subscription)
VALUES (
  'admin',
  'admin@fanclub.com',
  'システム管理者',
  'admin',
  '{"plan": "enterprise", "status": "active", "expiresAt": "2026-12-31T23:59:59.999Z"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 6. 確認クエリ
SELECT 'usersテーブルの設定完了' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as count FROM users GROUP BY role;


