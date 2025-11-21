# ドメイン設定ガイド

## ドメイン取得後の設定手順

### 1. Supabaseダッシュボードでの設定

#### Authentication > Settings > General
1. **Site URL** を設定：
   ```
   https://your-domain.com
   ```
   （例: `https://fanripi.com`）

#### Authentication > Settings > URL Configuration
2. **Redirect URLs** に以下を追加：
   ```
   https://your-domain.com/**
   https://your-domain.com/auth/reset-password
   https://your-domain.com/auth/verify-otp
   https://your-domain.com/app
   ```

#### Authentication > Settings > Email Templates
3. **Password Reset Email** のリダイレクトURLを確認：
   - テンプレート内の `{{ .ConfirmationURL }}` が正しく設定されているか確認

### 2. 環境変数の更新

#### `.env.local` ファイルを更新
```bash
# 既存の設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ドメイン設定を追加/更新
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### 本番環境（Vercel/Netlify）の環境変数も更新
- Vercel/Netlifyのダッシュボードで環境変数を更新

### 3. デプロイプラットフォームでの設定

#### Vercelの場合
1. **プロジェクト設定** → **Domains**
2. ドメインを追加
3. DNS設定に従ってCNAMEレコードを設定
4. SSL証明書は自動で設定されます

#### Netlifyの場合
1. **Site settings** → **Domain management**
2. **Add custom domain** をクリック
3. ドメインを入力
4. DNS設定に従ってレコードを設定
5. SSL証明書は自動で設定されます

### 4. DNS設定

#### 一般的な設定
- **Type**: CNAME
- **Name**: @ または www
- **Value**: Vercel/Netlifyが提供するCNAMEレコード
  - Vercel: `cname.vercel-dns.com`
  - Netlify: `your-site.netlify.app`

#### 例（Vercelの場合）
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5. 認証フローの確認

#### パスワードリセット
- メール内のリンクが `https://your-domain.com/auth/reset-password` にリダイレクトされることを確認

#### 確認コード認証
- メール/SMS内のリンクが `https://your-domain.com/auth/verify-otp` にリダイレクトされることを確認

#### OAuth認証（Google等）
- リダイレクトURLが `https://your-domain.com/auth/google/callback` になることを確認

### 6. セキュリティ設定

#### SSL証明書
- Vercel/Netlifyで自動設定されます
- 数分〜数時間で有効になります

#### セキュリティヘッダー
- `next.config.ts` で既に設定済み
- HSTS、CSP等が自動で適用されます

### 7. テスト手順

#### 1. ドメインの動作確認
```bash
# ブラウザでアクセス
https://your-domain.com
```

#### 2. 認証フローのテスト
1. **アカウント作成**: 新しいアカウントを作成
2. **ログイン**: 作成したアカウントでログイン
3. **パスワードリセット**: パスワードリセットメールを送信
4. **確認コード認証**: 確認コード認証をテスト（オプション）

#### 3. リダイレクトの確認
- パスワードリセットメールのリンクをクリック
- 正しいページにリダイレクトされることを確認

### 8. トラブルシューティング

#### ドメインが反映されない
- DNS設定の反映には最大48時間かかる場合があります
- `dig your-domain.com` でDNSレコードを確認

#### SSL証明書が発行されない
- Vercel/Netlifyで自動発行されますが、数時間かかる場合があります
- ダッシュボードでSSL証明書の状態を確認

#### 認証リダイレクトが失敗する
- SupabaseのRedirect URLsに正しいURLが設定されているか確認
- 環境変数 `NEXT_PUBLIC_APP_URL` が正しく設定されているか確認

#### メールが届かない
- SupabaseのSMTP設定を確認
- スパムフォルダを確認
- Supabaseのログでエラーを確認

### 9. チェックリスト

- [ ] SupabaseのSite URLを更新
- [ ] SupabaseのRedirect URLsにドメインを追加
- [ ] `.env.local` の `NEXT_PUBLIC_APP_URL` を更新
- [ ] 本番環境の環境変数を更新
- [ ] DNS設定を完了
- [ ] SSL証明書が発行されたことを確認
- [ ] ドメインでアクセスできることを確認
- [ ] 認証フローをテスト
- [ ] パスワードリセットをテスト
- [ ] 確認コード認証をテスト（オプション）

### 10. 推奨設定

#### 本番環境用の環境変数
```bash
# .env.production または Vercel/Netlifyの環境変数
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 開発環境用の環境変数
```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 次のステップ

1. Supabaseダッシュボードで設定を更新
2. 環境変数を更新
3. DNS設定を完了
4. デプロイ
5. テストを実施

