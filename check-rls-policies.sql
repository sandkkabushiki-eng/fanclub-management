-- RLSポリシー確認スクリプト
-- Supabase SQL Editorで実行して、RLSが正しく設定されているか確認してください

-- 1. RLS有効化確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users', 'subscriptions', 'sales', 'usage_tracking')
ORDER BY tablename;

-- 2. ポリシー確認
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
AND tablename IN ('models', 'monthly_data', 'users', 'subscriptions', 'sales', 'usage_tracking')
ORDER BY tablename, policyname;

-- 3. 各テーブルのRLS状態を詳細に確認
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
AND t.tablename IN ('models', 'monthly_data', 'users', 'subscriptions', 'sales', 'usage_tracking')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 4. 認証されていないユーザーでのアクセステスト（エラーが返ることを確認）
-- 注意: このクエリはエラーを返すはずです（RLSにより拒否される）
-- SELECT * FROM models LIMIT 1;

-- 5. 現在のユーザーID確認（認証済みの場合）
SELECT auth.uid() as current_user_id;

