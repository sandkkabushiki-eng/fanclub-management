-- SaaS運用のための最適化されたデータベーススキーマ
-- パフォーマンス、スケーラビリティ、セキュリティを考慮した設計

-- 1. ユーザーテーブル（最適化版）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'trial')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  data_usage_bytes BIGINT DEFAULT 0, -- データ使用量追跡
  api_calls_count INTEGER DEFAULT 0, -- API呼び出し回数追跡
  subscription JSONB DEFAULT '{"plan": "free", "status": "active", "expiresAt": null}'::jsonb
);

-- 2. モデルテーブル（最適化版）
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_main_model BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  data_size_bytes BIGINT DEFAULT 0 -- データサイズ追跡
);

-- 3. 月別データテーブル（最適化版）
CREATE TABLE IF NOT EXISTS monthly_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  data JSONB NOT NULL,
  analysis JSONB NOT NULL,
  data_size_bytes BIGINT NOT NULL, -- データサイズ追跡
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_id, year, month)
);

-- 4. サブスクリプション管理テーブル（最適化版）
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 売上記録テーブル（最適化版）
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- セント単位
  currency TEXT DEFAULT 'jpy',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'canceled', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 使用量追跡テーブル（新規）
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  data_transfer_bytes BIGINT DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 7. パフォーマンス最適化のためのインデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_main ON models(user_id, is_main_model) WHERE is_main_model = true;

CREATE INDEX IF NOT EXISTS idx_monthly_data_user_id ON monthly_data(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_model_id ON monthly_data(model_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_year_month ON monthly_data(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_model ON monthly_data(user_id, model_id);
CREATE INDEX IF NOT EXISTS idx_monthly_data_created_at ON monthly_data(created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_purchased_at ON sales(purchased_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);

-- 8. RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- 9. RLSポリシー（セキュリティ強化）
-- usersテーブル
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- modelsテーブル
CREATE POLICY "Users can access own models" ON models
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can access all models" ON models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- monthly_dataテーブル
CREATE POLICY "Users can access own monthly data" ON monthly_data
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can access all monthly data" ON monthly_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- subscriptionsテーブル
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- salesテーブル
CREATE POLICY "Users can view own sales" ON sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sales" ON sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- usage_trackingテーブル
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all usage" ON usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 10. トリガー関数（使用量追跡）
CREATE OR REPLACE FUNCTION update_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- 月別データのサイズを追跡
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- ユーザーの使用量を更新
    UPDATE users 
    SET data_usage_bytes = data_usage_bytes + NEW.data_size_bytes
    WHERE id = NEW.user_id;
    
    -- 日別使用量を記録
    INSERT INTO usage_tracking (user_id, date, storage_bytes)
    VALUES (NEW.user_id, CURRENT_DATE, NEW.data_size_bytes)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET storage_bytes = usage_tracking.storage_bytes + NEW.data_size_bytes;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- トリガーを設定
CREATE TRIGGER trigger_update_usage_tracking
  AFTER INSERT OR UPDATE ON monthly_data
  FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();

-- 11. データサイズ計算関数
CREATE OR REPLACE FUNCTION calculate_data_size(data JSONB)
RETURNS BIGINT AS $$
BEGIN
  RETURN pg_column_size(data);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

