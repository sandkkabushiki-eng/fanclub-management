# Supabase 確認コード認証（OTP）設定ガイド

## 確認コード認証とは

Supabaseでは、パスワードを使わずに確認コード（OTP: One-Time Password）で認証できます。以下の2つの方法があります：

1. **メール確認コード認証（Email OTP）**: メールアドレスに送信される確認コードでログイン
2. **SMS確認コード認証（Phone OTP）**: 電話番号にSMSで送信される確認コードでログイン

## 実装済みの機能

### ✅ メール確認コード認証
- `sendEmailOTP()`: メールアドレスに確認コードを送信
- `verifyEmailOTP()`: 確認コードを検証してログイン

### ✅ SMS確認コード認証
- `sendSMSOTP()`: 電話番号にSMSで確認コードを送信
- `verifySMSOTP()`: 確認コードを検証してログイン

### ✅ UIコンポーネント
- `/auth/verify-otp`: 確認コード入力ページ

## Supabaseダッシュボードでの設定

### 1. メール確認コード認証の設定

#### Authentication > Settings > Email
1. **Enable email confirmations**: 設定を確認
2. **Enable email change confirmations**: 設定を確認
3. **Enable password reset emails**: ON になっているか確認

#### SMTP設定
1. **Authentication** → **Settings** → **SMTP Settings**
2. **Enable Custom SMTP**: 
   - **OFF**: SupabaseのデフォルトSMTPを使用（開発用、制限あり）
   - **ON**: カスタムSMTPサーバーを使用（本番環境推奨）

### 2. SMS確認コード認証の設定

#### Authentication > Settings > Phone
1. **Enable phone signups**: ON にする
2. **Phone provider**: Twilio または MessageBird を選択
3. **Phone provider settings**: プロバイダーの設定を行う

#### Twilio設定（推奨）
1. **Twilio Account SID**: TwilioアカウントのSID
2. **Twilio Auth Token**: Twilioの認証トークン
3. **Twilio Phone Number**: Twilioの電話番号

#### MessageBird設定
1. **MessageBird API Key**: MessageBirdのAPIキー
2. **MessageBird Originator**: 送信者番号

### 3. リダイレクトURLの設定

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
   https://your-app-domain.com/auth/verify-otp
   http://localhost:3000/auth/verify-otp
   ```

## 使用方法

### メール確認コード認証

1. **確認コード送信**
   ```typescript
   const result = await authManager.sendEmailOTP('user@example.com');
   if (result.success) {
     // 確認コードがメールに送信されました
   }
   ```

2. **確認コード検証**
   ```typescript
   const session = await authManager.verifyEmailOTP('user@example.com', '123456');
   if (session) {
     // ログイン成功
   }
   ```

### SMS確認コード認証

1. **確認コード送信**
   ```typescript
   const result = await authManager.sendSMSOTP('+819012345678');
   if (result.success) {
     // 確認コードがSMSで送信されました
   }
   ```

2. **確認コード検証**
   ```typescript
   const session = await authManager.verifySMSOTP('+819012345678', '123456');
   if (session) {
     // ログイン成功
   }
   ```

## UIでの使用

### ログインページから確認コード認証へ

1. ログインページに「確認コードでログイン」ボタンを追加
2. `/auth/verify-otp` ページに遷移
3. メールアドレスまたは電話番号を入力
4. 確認コードを送信
5. 確認コードを入力して検証

### 実装例

```tsx
// SecureAuth.tsx に追加
<button
  onClick={() => router.push('/auth/verify-otp')}
  className="text-sm text-pink-600 hover:text-pink-800"
>
  確認コードでログイン
</button>
```

## セキュリティ設定

### 確認コードの有効期限
- **デフォルト**: 60秒
- **設定場所**: Supabaseダッシュボード → Authentication → Settings

### 確認コードの再送信制限
- **デフォルト**: 1分間に1回
- **設定場所**: Supabaseダッシュボード → Authentication → Settings

### 確認コードの試行回数制限
- **デフォルト**: 5回
- **設定場所**: Supabaseダッシュボード → Authentication → Settings

## トラブルシューティング

### メールが届かない
1. **スパムフォルダを確認**
2. **メールアドレスが正しいか確認**
3. **SMTP設定を確認**
4. **Supabaseのログを確認**

### SMSが届かない
1. **電話番号の形式を確認**（国際形式で入力: +81 90-1234-5678）
2. **Twilio/MessageBirdの設定を確認**
3. **電話番号が正しいか確認**
4. **Supabaseのログを確認**

### 確認コードが無効
1. **確認コードの有効期限を確認**（通常60秒）
2. **確認コードを再送信**
3. **入力したコードが正しいか確認**

### エラー: "Rate limit exceeded"
- **原因**: 確認コードの送信回数制限に達した
- **解決策**: しばらく待ってから再試行

## 本番環境での推奨設定

### メール確認コード認証
- ✅ カスタムSMTPの設定
- ✅ リダイレクトURLの設定
- ✅ メールテンプレートのカスタマイズ

### SMS確認コード認証
- ✅ TwilioまたはMessageBirdの設定
- ✅ 電話番号の検証
- ✅ レート制限の設定

## コスト

### メール確認コード認証
- **SupabaseデフォルトSMTP**: 無料（制限あり）
- **カスタムSMTP**: SMTPプロバイダーの料金に依存

### SMS確認コード認証
- **Twilio**: 1通あたり約0.01ドル（国によって異なる）
- **MessageBird**: 1通あたり約0.01ドル（国によって異なる）

## 次のステップ

1. Supabaseダッシュボードでメール/SMS設定を確認
2. リダイレクトURLを設定
3. テストユーザーで確認コード認証をテスト
4. 本番環境ではカスタムSMTP/Twilioを設定

