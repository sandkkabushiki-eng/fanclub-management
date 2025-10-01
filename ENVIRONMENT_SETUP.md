# 環境変数設定ガイド

## 必要な環境変数

### Supabase設定
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Stripe設定
```bash
STRIPE_SECRET_KEY=sk_test_... # テスト環境
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_MONTHLY=price_... # 月額プランの価格ID
STRIPE_PRICE_ID_YEARLY=price_... # 年額プランの価格ID
```

### アプリケーション設定
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## 設定手順

### 1. Supabase設定
1. Supabaseダッシュボード → Settings → API
2. Project URL と anon public key をコピー
3. service_role key をコピー（機密情報）

### 2. Stripe設定
1. Stripeダッシュボード → Developers → API keys
2. Secret key と Publishable key をコピー
3. Products → 新しい商品を作成
4. 月額・年額の価格を作成し、価格IDをコピー

### 3. Stripe Webhook設定
1. Stripeダッシュボード → Developers → Webhooks
2. "Add endpoint" をクリック
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. イベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Webhook signing secret をコピー

### 4. Vercel環境変数設定
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 上記の環境変数をすべて追加
3. Production, Preview, Development すべてに適用

## ローカル開発環境
`.env.local` ファイルを作成:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 本番環境での注意事項
- Stripeの本番キーを使用
- Webhookの本番URLを設定
- セキュリティのため、service_role_keyは絶対に公開しない



