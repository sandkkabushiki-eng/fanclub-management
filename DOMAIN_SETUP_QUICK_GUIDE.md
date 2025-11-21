# ドメイン設定 クイックガイド

## やること（2つの設定だけ）

### 1. Supabaseダッシュボードでの設定 ⭐

#### ステップ1: Site URLを更新
1. Supabaseダッシュボード → **Authentication** → **Settings** → **General**
2. **Site URL** を変更：
   ```
   https://your-domain.com
   ```

#### ステップ2: Redirect URLsを追加
1. **Authentication** → **Settings** → **URL Configuration**
2. **Redirect URLs** に以下を追加（1行ずつ）：
   ```
   https://your-domain.com/**
   https://your-domain.com/auth/reset-password
   https://your-domain.com/auth/verify-otp
   https://your-domain.com/app
   ```

### 2. Vercelでの設定 ⭐

#### ステップ1: ドメインを追加
1. Vercelダッシュボード → プロジェクト → **Settings** → **Domains**
2. **Add Domain** をクリック
3. ドメインを入力（例: `your-domain.com`）
4. **Add** をクリック

#### ステップ2: DNS設定
Vercelが表示するCNAMEレコードをDNSプロバイダーで設定：
- **Type**: CNAME
- **Name**: @ または www
- **Value**: Vercelが表示する値（例: `cname.vercel-dns.com`）

#### ステップ3: 環境変数を更新
1. Vercelダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. `NEXT_PUBLIC_APP_URL` を追加/更新：
   ```
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```
3. **Save** をクリック
4. **Redeploy** を実行（環境変数変更後は再デプロイが必要）

## 完了！

これで設定完了です。DNSの反映には数分〜数時間かかる場合があります。

## 確認方法

1. **DNSの反映確認**（数分〜数時間後）
   ```bash
   # ターミナルで実行
   dig your-domain.com
   ```

2. **ブラウザでアクセス**
   ```
   https://your-domain.com
   ```

3. **認証をテスト**
   - アカウント作成
   - ログイン
   - パスワードリセット（メール内のリンクが正しく動作するか確認）

## トラブルシューティング

### ドメインが反映されない
- DNS設定の反映には最大48時間かかる場合があります
- DNSプロバイダーの設定を確認

### SSL証明書が発行されない
- Vercelで自動発行されますが、数時間かかる場合があります
- VercelダッシュボードでSSL証明書の状態を確認

### 認証リダイレクトが失敗する
- SupabaseのRedirect URLsに正しいURLが設定されているか確認
- 環境変数 `NEXT_PUBLIC_APP_URL` が正しく設定されているか確認

## まとめ

✅ **Supabase**: Site URL + Redirect URLs を設定  
✅ **Vercel**: ドメイン追加 + DNS設定 + 環境変数更新

これだけです！

