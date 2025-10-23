# Row Level Security (RLS) 設定ガイド

## 🔐 **Supabase RLS 設定手順**

### **1. Supabaseダッシュボードにアクセス**

1. **Supabaseダッシュボード**にログイン: https://supabase.com
2. **プロジェクト選択**: `aksptiaptxogdipuysut` プロジェクトを選択
3. **SQL Editor** に移動

### **2. RLS設定スクリプトの実行**

1. **SQL Editor** を開く
2. `supabase-rls-setup.sql` の内容をコピー
3. **Run** ボタンをクリックして実行

### **3. 設定内容の確認**

#### **有効化されるRLSテーブル**
- ✅ `models` - モデル情報
- ✅ `monthly_data` - 月別データ
- ✅ `users` - ユーザー情報
- ✅ `access_logs` - アクセスログ

#### **セキュリティポリシー**
- **ユーザー**: 自分のデータのみアクセス可能
- **管理者**: 全ユーザーのデータにアクセス可能
- **自動監査**: すべてのアクセスがログ記録

### **4. 管理者アカウントの作成**

```sql
-- 管理者アカウントを作成
SELECT create_admin_user(
  'shokei0402@gmail.com',
  'shokei20030402'
);
```

### **5. 設定確認**

#### **RLS有効化確認**
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'monthly_data', 'users', 'access_logs');
```

#### **ポリシー確認**
```sql
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
```

## 🛡️ **セキュリティ機能**

### **データ分離**
- ユーザー毎に完全にデータが分離
- 他のユーザーのデータは一切アクセス不可
- 管理者のみが全データにアクセス可能

### **アクセス制御**
- テーブルレベルでの厳格な制御
- 自動的なユーザー認証チェック
- ロールベースアクセス制御

### **監査ログ**
- すべてのデータアクセスが記録
- 不正アクセスの検知が可能
- 管理者による監視機能

## 🔧 **トラブルシューティング**

### **よくある問題**

#### **1. RLSエラー**
```
Error: new row violates row-level security policy
```
**解決策**: ユーザーIDが正しく設定されているか確認

#### **2. データが見えない**
```
Error: insufficient privileges
```
**解決策**: 適切なポリシーが設定されているか確認

#### **3. 管理者アクセス不可**
```
Error: admin role not found
```
**解決策**: 管理者ユーザーが正しく作成されているか確認

### **設定リセット**

```sql
-- 全ポリシーを削除
DROP POLICY IF EXISTS "Users can only access their own models" ON models;
DROP POLICY IF EXISTS "Admins can access all models" ON models;
DROP POLICY IF EXISTS "Users can only access their own monthly data" ON monthly_data;
DROP POLICY IF EXISTS "Admins can access all monthly data" ON monthly_data;
DROP POLICY IF EXISTS "Users can access their own profile" ON users;
DROP POLICY IF EXISTS "Admins can access all user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own access logs" ON access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON access_logs;

-- RLSを無効化
ALTER TABLE models DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs DISABLE ROW LEVEL SECURITY;
```

## 📊 **パフォーマンス最適化**

### **インデックス**
- `user_id` カラムにインデックス作成済み
- 複合インデックスで高速クエリ実現
- 自動的なクエリ最適化

### **監視**
- アクセスログでパフォーマンス監視
- 異常なアクセスパターンの検知
- 自動的なセキュリティアラート

## ✅ **設定完了チェックリスト**

- [ ] SQLスクリプトの実行完了
- [ ] RLSが全テーブルで有効化
- [ ] セキュリティポリシーの設定完了
- [ ] 管理者アカウントの作成完了
- [ ] インデックスの作成完了
- [ ] アクセスログテーブルの作成完了
- [ ] 設定確認クエリの実行完了

---

**注意**: この設定により、完全なデータ分離が実現されます。各ユーザーは自分のデータのみにアクセスでき、管理者のみが全データを監視・管理できます。





