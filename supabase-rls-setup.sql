-- Row Level Security (RLS) 設定スクリプト
-- ファンクラブ管理システム用のセキュリティ設定

-- 1. 既存のテーブルにRLSを有効化
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;

-- 2. ユーザーテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  subscription JSONB
);

-- 3. ユーザーテーブルにRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. modelsテーブルのRLSポリシー
-- ユーザーは自分のモデルのみアクセス可能
CREATE POLICY "Users can only access their own models" ON models
  FOR ALL USING (user_id = auth.uid());

-- 管理者は全てのモデルにアクセス可能
CREATE POLICY "Admins can access all models" ON models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. monthly_dataテーブルのRLSポリシー
-- ユーザーは自分の月別データのみアクセス可能
CREATE POLICY "Users can only access their own monthly data" ON monthly_data
  FOR ALL USING (user_id = auth.uid());

-- 管理者は全ての月別データにアクセス可能
CREATE POLICY "Admins can access all monthly data" ON monthly_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 6. usersテーブルのRLSポリシー
-- ユーザーは自分の情報のみアクセス可能
CREATE POLICY "Users can access their own profile" ON users
  FOR ALL USING (id = auth.uid());

-- 管理者は全てのユーザー情報にアクセス可能
CREATE POLICY "Admins can access all user profiles" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 7. 既存のテーブル構造を更新（user_idカラムを追加）
-- modelsテーブルにuser_idカラムを追加（存在しない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'models' AND column_name = 'user_id') THEN
    ALTER TABLE models ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- monthly_dataテーブルにuser_idカラムを追加（存在しない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'monthly_data' AND column_name = 'user_id') THEN
    ALTER TABLE monthly_data ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 8. 既存データのuser_idを設定（管理者のIDに設定）
-- 注意: 実際の管理者のユーザーIDに変更してください
UPDATE models SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
UPDATE monthly_data SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

-- 9. user_idカラムをNOT NULLに設定
ALTER TABLE models ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE monthly_data ALTER COLUMN user_id SET NOT NULL;

-- 10. インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_id ON monthly_data(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_model_user ON monthly_data(model_id, user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 11. 管理者ユーザーを作成する関数
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_email TEXT,
  admin_password TEXT
) RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- 管理者ユーザーを作成
  user_id := auth.signup(
    email := admin_email,
    password := admin_password
  );
  
  -- ユーザー情報をusersテーブルに追加
  INSERT INTO users (id, email, name, role, is_active)
  VALUES (user_id, admin_email, 'システム管理者', 'admin', true);
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. ユーザー作成時の自動処理関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーの情報をusersテーブルに追加
  INSERT INTO users (id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'),
    'user',
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 新規ユーザー作成時のトリガー
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 14. データアクセス監査ログテーブル
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 15. アクセスログのRLSポリシー
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs" ON access_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access logs" ON access_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 16. セキュリティ設定の確認
-- RLSが有効になっているかチェック
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users', 'access_logs');

-- 17. ポリシーの確認
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
ORDER BY tablename, policyname;



