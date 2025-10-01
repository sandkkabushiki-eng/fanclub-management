-- サブスクリプション管理テーブル
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 売上記録テーブル
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- セント単位
  currency TEXT DEFAULT 'jpy',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'canceled', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_purchased_at ON sales(purchased_at);

-- RLS有効化
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- subscriptionsテーブルのRLSポリシー
-- ユーザーは自分のサブスクリプションのみ閲覧可能
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全サブスクリプションを閲覧可能
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- salesテーブルのRLSポリシー
-- ユーザーは自分の売上記録のみ閲覧可能
CREATE POLICY "Users can view own sales" ON sales
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全売上記録を閲覧可能
CREATE POLICY "Admins can view all sales" ON sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 売上サマリービュー（管理者専用）
CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT 
  DATE_TRUNC('month', purchased_at) as month,
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue_cents,
  COUNT(DISTINCT user_id) as unique_customers
FROM sales 
WHERE status = 'succeeded'
GROUP BY DATE_TRUNC('month', purchased_at)
ORDER BY month DESC;

-- 売上サマリー取得用RPC関数
CREATE OR REPLACE FUNCTION get_revenue_summary()
RETURNS TABLE (
  month TIMESTAMPTZ,
  transaction_count BIGINT,
  total_revenue_cents BIGINT,
  unique_customers BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', s.purchased_at) as month,
    COUNT(*) as transaction_count,
    SUM(s.amount) as total_revenue_cents,
    COUNT(DISTINCT s.user_id) as unique_customers
  FROM sales s
  WHERE s.status = 'succeeded'
  GROUP BY DATE_TRUNC('month', s.purchased_at)
  ORDER BY month DESC;
END;
$$;

-- アクティブサブスクリプション取得用RPC関数
CREATE OR REPLACE FUNCTION get_active_subscriptions()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  name TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    u.email,
    u.name,
    s.status,
    s.current_period_end,
    s.created_at
  FROM subscriptions s
  JOIN users u ON u.id = s.user_id
  WHERE s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC;
END;
$$;

-- サブスクリプション更新用トリガー
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();



