-- subscriptionsテーブルのprice_idをNULL許容に変更
-- これにより、Webhookでの初期作成時にprice_idがなくてもエラーにならない

ALTER TABLE subscriptions ALTER COLUMN price_id DROP NOT NULL;

-- デフォルト値を設定（オプション）
ALTER TABLE subscriptions ALTER COLUMN price_id SET DEFAULT 'pro_monthly';

-- 確認
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND column_name = 'price_id';

