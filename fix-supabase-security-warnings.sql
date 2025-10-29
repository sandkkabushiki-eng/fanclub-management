-- Supabaseセキュリティ警告の修正スクリプト
-- 2025年10月27日のセキュリティアドバイザー警告に対応

-- ============================================
-- 1. 関数検索パス (search_path) の修正
-- ============================================

-- パブリック関数の検索パスを固定（セキュリティベストプラクティス）
-- create_admin_user関数の修正
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔒 検索パスを固定
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- ユーザーを作成
  INSERT INTO public.users (email, name, role, is_active)
  VALUES (p_email, p_name, 'admin', true)
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- 新しいユーザーハンドル関数の修正
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔒 検索パスを固定
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, is_active, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET last_login_at = NOW();
  
  RETURN NEW;
END;
$$;

-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 認証関連のセキュリティ設定
-- ============================================

-- 漏洩したパスワード保護を有効化（Supabase Dashboard経由で設定する必要があります）
-- これはSQLでは直接設定できないため、Supabase Dashboardで以下の手順を実行してください：
-- 1. Supabase Dashboard → Authentication → Policies
-- 2. "Password Protection" セクション
-- 3. "Enable leaked password protection" をONにする

-- ============================================
-- 3. RLSポリシーの再確認
-- ============================================

-- すべてのテーブルでRLSが有効であることを確認
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_data ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して再作成（冪等性を保証）
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own models" ON public.models;
DROP POLICY IF EXISTS "Users can insert own models" ON public.models;
DROP POLICY IF EXISTS "Users can update own models" ON public.models;
DROP POLICY IF EXISTS "Users can delete own models" ON public.models;
DROP POLICY IF EXISTS "Users can view own monthly data" ON public.monthly_data;
DROP POLICY IF EXISTS "Users can insert own monthly data" ON public.monthly_data;
DROP POLICY IF EXISTS "Users can update own monthly data" ON public.monthly_data;
DROP POLICY IF EXISTS "Users can delete own monthly data" ON public.monthly_data;

-- usersテーブルのポリシー
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- modelsテーブルのポリシー
CREATE POLICY "Users can view own models"
  ON public.models
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON public.models
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON public.models
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON public.models
  FOR DELETE
  USING (auth.uid() = user_id);

-- monthly_dataテーブルのポリシー
CREATE POLICY "Users can view own monthly data"
  ON public.monthly_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly data"
  ON public.monthly_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly data"
  ON public.monthly_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly data"
  ON public.monthly_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. 関数の権限設定
-- ============================================

-- パブリック関数の実行権限を制限
REVOKE ALL ON FUNCTION public.create_admin_user(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 認証されたユーザーのみが実行可能
GRANT EXECUTE ON FUNCTION public.create_admin_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ============================================
-- 完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ セキュリティ警告の修正が完了しました';
  RAISE NOTICE '⚠️ 次のステップ:';
  RAISE NOTICE '1. Supabase Dashboard → Authentication → Policies';
  RAISE NOTICE '2. "Enable leaked password protection" をONにしてください';
  RAISE NOTICE '3. セキュリティアドバイザーで警告が消えたことを確認してください';
END $$;

