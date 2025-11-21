# Supabase メール設定ガイド

## パスワードリセットメールが送られない場合の対処法

### 1. Supabaseダッシュボードでの設定確認

#### Authentication > Settings > Email
1. **Enable email confirmations**: 設定を確認
2. **Enable email change confirmations**: 設定を確認
3. **Enable password reset emails**: **ON** になっているか確認

#### SMTP設定
1. **Authentication** → **Settings** → **SMTP Settings**
2. **Enable Custom SMTP**: 
   - **OFF**: SupabaseのデフォルトSMTPを使用（開発用、制限あり）
   - **ON**: カスタムSMTPサーバーを使用（本番環境推奨）

### 2. リダイレクトURLの設定

#### Site URL設定
1. **Authentication** → **Settings** → **General**
2. **Site URL** を設定：
   ```
   https://your-app-domain.com
   ```
   または開発環境の場合：
   ```
   http://localhost:3000
   ```

#### Redirect URLs設定
1. **Authentication** → **Settings** → **URL Configuration**
2. **Redirect URLs** に以下を追加：
   ```
   https://your-app-domain.com/auth/reset-password
   http://localhost:3000/auth/reset-password
   ```

### 3. メールテンプレートの確認

#### Password Reset Email テンプレート
1. **Authentication** → **Email Templates** → **Reset Password**
2. テンプレートが正しく設定されているか確認
3. 必要に応じてカスタマイズ

#### テンプレート変数
- `{{ .ConfirmationURL }}`: パスワードリセットリンク
- `{{ .Email }}`: ユーザーのメールアドレス
- `{{ .Token }}`: リセットトークン（通常は使用しない）

### 4. カスタムSMTP設定（本番環境推奨）

#### Gmailを使用する場合
1. **Enable Custom SMTP**: ON
2. **SMTP Host**: `smtp.gmail.com`
3. **SMTP Port**: `587`
4. **SMTP User**: あなたのGmailアドレス
5. **SMTP Password**: アプリパスワード（2段階認証を有効化した場合）
6. **Sender email**: 送信元メールアドレス
7. **Sender name**: 送信者名（例: ファンリピ）

#### SendGridを使用する場合
1. **Enable Custom SMTP**: ON
2. **SMTP Host**: `smtp.sendgrid.net`
3. **SMTP Port**: `587`
4. **SMTP User**: `apikey`
5. **SMTP Password**: SendGridのAPIキー
6. **Sender email**: 送信元メールアドレス
7. **Sender name**: 送信者名

#### その他のSMTPプロバイダー
- **Mailgun**: `smtp.mailgun.org`
- **Amazon SES**: AWS SESのSMTP設定を使用
- **Postmark**: `smtp.postmarkapp.com`

### 5. 開発環境でのテスト

#### メール送信の確認方法
1. Supabaseダッシュボード → **Authentication** → **Users**
2. テストユーザーでパスワードリセットを実行
3. **Logs** タブでメール送信ログを確認

#### メールが送られない場合の確認項目
- [ ] SMTP設定が正しいか
- [ ] リダイレクトURLが正しく設定されているか
- [ ] メールアドレスが正しいか
- [ ] スパムフォルダを確認
- [ ] Supabaseのログでエラーがないか確認

### 6. トラブルシューティング

#### エラー: "Email rate limit exceeded"
- **原因**: メール送信のレート制限に達した
- **解決策**: しばらく待ってから再試行、またはカスタムSMTPを使用

#### エラー: "Invalid email"
- **原因**: メールアドレスの形式が正しくない
- **解決策**: メールアドレスの形式を確認

#### エラー: "User not found"
- **原因**: そのメールアドレスで登録されていない
- **解決策**: 登録済みのメールアドレスを使用

#### メールが届かない
1. **スパムフォルダを確認**
2. **メールアドレスが正しいか確認**
3. **SMTP設定を確認**
4. **Supabaseのログを確認**

### 7. 本番環境での推奨設定

#### 必須設定
- ✅ カスタムSMTPの設定
- ✅ リダイレクトURLの設定
- ✅ メールテンプレートのカスタマイズ
- ✅ 送信者名の設定

#### セキュリティ設定
- ✅ SPFレコードの設定（ドメイン認証）
- ✅ DKIM署名の設定（メール認証）
- ✅ DMARCポリシーの設定（メール認証）

### 8. テスト手順

1. **テストユーザーでパスワードリセットを実行**
   ```
   1. ログインページで「パスワードを忘れた場合」をクリック
   2. メールアドレスを入力
   3. 「リセットメールを送信」をクリック
   ```

2. **メールを確認**
   - 受信トレイを確認
   - スパムフォルダも確認

3. **リンクをクリック**
   - メール内のリンクをクリック
   - パスワードリセットページが開くことを確認

4. **新しいパスワードを設定**
   - 新しいパスワードを入力
   - 確認パスワードを入力
   - 「パスワードを更新」をクリック

5. **ログインを確認**
   - 新しいパスワードでログインできることを確認

### 9. 実装済みの機能

- ✅ パスワードリセットメール送信機能
- ✅ パスワードリセットページ（`/auth/reset-password`）
- ✅ パスワード更新機能
- ✅ エラーハンドリング
- ✅ バリデーション

### 10. 次のステップ

1. SupabaseダッシュボードでSMTP設定を確認
2. リダイレクトURLを設定
3. テストユーザーでパスワードリセットをテスト
4. 本番環境ではカスタムSMTPを設定

