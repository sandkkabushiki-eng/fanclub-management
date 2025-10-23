# Supabase認証設定ガイド

## 1. Supabaseダッシュボードでの設定

### Authentication設定
1. Supabaseダッシュボード → Authentication → Settings
2. **Email confirmation** を **OFF** に設定
3. **Enable email confirmations** のチェックを外す

### 理由
- 開発段階では確認メールなしで即座にログインできるようにする
- 本番運用時には再度有効化する

## 2. 現在の実装

### 認証フロー
1. **ユーザー登録**: `adminSupabase.auth.signUp()`
2. **ユーザー情報保存**: `users`テーブルに保存
3. **ログイン**: `adminSupabase.auth.signInWithPassword()`
4. **データアクセス**: RLSでユーザー分離

### データ保存場所
- **認証情報**: Supabase Auth (auth.users)
- **ユーザープロフィール**: public.users
- **モデルデータ**: public.models (user_idで分離)
- **CSVデータ**: public.monthly_data (user_idで分離)

## 3. データ統合の仕組み

### AさんのCSVデータとアカウントの紐付け
1. Aさんがアカウント作成 → `auth.users`と`public.users`に保存
2. AさんがCSVアップロード → `public.monthly_data`に`user_id`付きで保存
3. Aさんがログイン → 自分の`user_id`のデータのみ取得可能
4. RLSポリシーにより他ユーザーのデータは見えない

### セキュリティ
- Row Level Security (RLS) でデータ分離
- 各テーブルに`user_id`カラムでユーザー紐付け
- 管理者のみ全ユーザーデータアクセス可能





