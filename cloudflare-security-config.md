# Cloudflare セキュリティ設定ガイド

## 1. Cloudflare の基本設定

### 1.1 DNS設定
1. Cloudflareダッシュボードにログイン
2. ドメインを追加
3. DNSレコードを設定（AレコードまたはCNAME）

### 1.2 SSL/TLS設定
- **暗号化モード**: Full (strict)
- **TLS 1.3**: 有効化
- **自動HTTPSリライト**: 有効化
- **常時HTTPS**: 有効化

### 1.3 セキュリティ設定

#### WAF (Web Application Firewall)
- **有効化**: ON
- **セキュリティレベル**: Medium（推奨）または High
- **チャレンジパッセージ**: 5分間

#### ボット対策
- **ボットファイトモード**: ON
- **JavaScriptチャレンジ**: 有効化
- **自動チャレンジ**: 有効化

#### DDoS対策
- **自動DDoS保護**: ON
- **レート制限**: 設定済み（後述）

#### レート制限ルール
以下のルールを設定：

1. **ログイン試行制限**
   - パス: `/api/auth/*` または `/login`
   - レート: 5回/分
   - アクション: チャレンジまたはブロック

2. **APIレート制限**
   - パス: `/api/*`
   - レート: 100回/分（IPアドレスごと）
   - アクション: チャレンジ

3. **一般ページレート制限**
   - パス: `/*`
   - レート: 200回/分
   - アクション: チャレンジ

### 1.4 ページルール設定

#### キャッシュ設定
- **パス**: `/_next/static/*`
- **設定**: キャッシュレベル: 標準、エッジTTL: 1年

#### セキュリティ設定
- **パス**: `/api/*`
- **設定**: セキュリティレベル: 高、キャッシュ: 無効

### 1.5 セキュリティヘッダー（Transform Rules）

以下のヘッダーを追加：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

X-Content-Type-Options: nosniff

X-Frame-Options: DENY

X-XSS-Protection: 1; mode=block

Referrer-Policy: strict-origin-when-cross-origin

Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 1.6 ファイアウォールルール

#### ボットブロック
- **条件**: Bot Score < 30
- **アクション**: ブロック

#### 国別ブロック（必要に応じて）
- **条件**: Country not in (JP, US, ...)
- **アクション**: チャレンジまたはブロック

#### IPアドレスブロック
- 既知の悪意のあるIPアドレスをブロック

### 1.7 ログと監視

#### Cloudflare Analytics
- **Web Analytics**: 有効化
- **Security Events**: 有効化
- **Bot Analytics**: 有効化

#### アラート設定
- DDoS攻撃検知時
- 異常なトラフィックパターン
- セキュリティイベント

## 2. Cloudflare Workers（オプション）

### 2.1 追加のセキュリティチェック
```javascript
// Cloudflare Worker で追加のセキュリティチェックを実装
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // IPアドレスベースのレート制限
  // ボット検知
  // セキュリティヘッダーの追加
  // など
}
```

## 3. Cloudflare Tunnel（オプション）

### 3.1 内部サービスへのアクセス
- Supabaseなどの内部サービスへの安全なアクセス
- 公開IPアドレスを不要にする

## 4. 設定確認チェックリスト

- [ ] SSL/TLS設定が Full (strict) になっている
- [ ] WAFが有効になっている
- [ ] ボット対策が有効になっている
- [ ] DDoS保護が有効になっている
- [ ] レート制限ルールが設定されている
- [ ] セキュリティヘッダーが設定されている
- [ ] ファイアウォールルールが設定されている
- [ ] ログと監視が有効になっている

## 5. 推奨設定値

### セキュリティレベル
- **開発環境**: Medium
- **本番環境**: High

### レート制限
- **ログイン**: 5回/分
- **API**: 100回/分
- **一般ページ**: 200回/分

### キャッシュ
- **静的ファイル**: 1年
- **API**: キャッシュ無効
- **HTML**: 5分

