# Supabase認証設定ガイド

## 🔧 必要な設定手順

### 1. Supabaseダッシュボードでの設定確認

#### Authentication設定
1. **Supabaseダッシュボード** → **Authentication** → **Settings**
2. **Site URL** を設定：
   ```
   https://fanclub-management-37m9n9w7c-sandkkabushiki-engs-projects.vercel.app
   ```
3. **Redirect URLs** に以下を追加：
   ```
   https://fanclub-management-37m9n9w7c-sandkkabushiki-engs-projects.vercel.app/**
   ```

#### Email設定
1. **Authentication** → **Settings** → **SMTP Settings**
2. **Enable email confirmations** を **OFF** にする（開発用）
3. **Enable email change confirmations** を **OFF** にする（開発用）

### 2. SQLスクリプトの実行

#### ステップ1: 設定確認
1. Supabaseダッシュボード → **SQL Editor**
2. `supabase-config-check.sql` の内容をコピー&ペースト
3. **Run** をクリックして実行
4. 結果を確認

#### ステップ2: usersテーブル修正
1. SQL Editorで `supabase-users-table-fix.sql` の内容をコピー&ペースト
2. **Run** をクリックして実行
3. エラーがないことを確認

### 3. 環境変数の確認

Vercelダッシュボードで以下の環境変数が設定されていることを確認：

```
NEXT_PUBLIC_SUPABASE_URL=https://aksptiaptxogdipuysut.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTIzMjMsImV4cCI6MjA3NDE4ODMyM30.56TBLIIvYIk5R4Moyhe2PluQMTq7gZ51suXFesrkULA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMjMyMywiZXhwIjoyMDc0MTg4MzIzfQ.EpJsXq17uDoqlr7rP0HY4yv0zSEhS9OiCGgHTHFHHmI
```

### 4. テスト手順

1. **アプリを開く**: https://fanclub-management-37m9n9w7c-sandkkabushiki-engs-projects.vercel.app
2. **開発者ツール（F12）を開く**
3. **Consoleタブを確認**
4. **新しいメールアドレスでアカウント作成を試す**
5. **エラーメッセージを確認**

### 5. よくある問題と解決方法

#### 問題1: "User already registered" エラー
**解決方法**: 異なるメールアドレスを使用するか、Supabaseダッシュボードで既存ユーザーを削除

#### 問題2: RLSポリシーエラー
**解決方法**: `supabase-users-table-fix.sql` を実行してRLSポリシーを修正

#### 問題3: メール確認が必要
**解決方法**: Authentication設定でメール確認を無効化

## 📋 確認チェックリスト

- [ ] SupabaseダッシュボードでAuthentication設定を確認
- [ ] Site URLとRedirect URLsを設定
- [ ] メール確認を無効化
- [ ] `supabase-config-check.sql` を実行
- [ ] `supabase-users-table-fix.sql` を実行
- [ ] Vercel環境変数を確認
- [ ] アプリでアカウント作成をテスト
- [ ] ブラウザコンソールでエラーを確認


