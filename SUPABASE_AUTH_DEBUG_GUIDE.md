# Supabase Auth デバッグガイド

## 問題の状況
- アカウント作成は成功している
- Supabaseの`users`テーブルに名前が保存されている
- しかしログインできない

## 確認手順

### 1. Supabase SQL Editorでデバッグスクリプトを実行

`supabase-auth-debug.sql`の内容をSupabase SQL Editorに貼り付けて実行してください。

### 2. Supabase DashboardでAuth設定を確認

#### Authentication > Settings > General
- **Enable email confirmations**: `OFF` に設定されているか確認
- **Enable email change confirmations**: `OFF` に設定されているか確認

#### Authentication > Settings > Email Templates
- **Confirm signup**: テンプレートが正しく設定されているか確認

### 3. 考えられる問題と解決策

#### 問題1: メール確認が必要
**症状**: `email_confirmed_at`が`NULL`
**解決策**: 
1. Supabase Dashboard > Authentication > Settings > General
2. "Enable email confirmations" を `OFF` に設定

#### 問題2: パスワードが正しく保存されていない
**症状**: ログイン時に認証エラー
**解決策**: 
1. 新しいメールアドレスでアカウント作成を試す
2. ブラウザの開発者ツールでネットワークタブを確認

#### 問題3: トリガーが正しく動作していない
**症状**: `auth.users`にはデータがあるが`public.users`にない
**解決策**: 
1. トリガーを再作成する
2. 手動でユーザーデータを作成する

### 4. 緊急時の手動ユーザー作成

```sql
-- 手動でユーザーデータを作成（緊急時のみ）
INSERT INTO public.users (id, email, name, role, subscription)
VALUES (
  'your-user-id-here',
  'your-email@example.com',
  'ユーザー',
  'user',
  '{"plan": "basic", "status": "active", "expiresAt": "2025-12-31T23:59:59.999Z"}'::jsonb
);
```

### 5. ログイン確認手順

1. ブラウザの開発者ツールを開く（F12）
2. Consoleタブを確認
3. Networkタブでログインリクエストを確認
4. エラーメッセージを記録

## 次のステップ

デバッグスクリプトの結果を確認後、具体的な問題に応じて対応します。


