# SaaS運用ガイド

## 🚀 本格運用のための設定

### 1. データベース移行

#### 既存データの移行
```sql
-- 1. 新しいスキーマを適用
\i supabase-saas-optimized-schema.sql

-- 2. 既存データの移行（必要に応じて）
-- データサイズの計算と更新
UPDATE monthly_data 
SET data_size_bytes = pg_column_size(data) + pg_column_size(analysis);

-- 3. インデックスの再構築
REINDEX DATABASE your_database_name;
```

### 2. 環境変数の設定

#### 本番環境
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### 監視用環境変数
```bash
# 監視・アラート用
MONITORING_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_EMAIL=admin@yourcompany.com
RATE_LIMIT_REDIS_URL=redis://...
```

### 3. Vercel設定の最適化

#### vercel.json（本番用）
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin",
      "destination": "/admin/dashboard",
      "permanent": true
    }
  ]
}
```

### 4. 監視・アラート設定

#### システム監視
- **データ転送量**: 1GB/日でアラート
- **API呼び出し**: 10万回/日でアラート
- **エラー率**: 5%以上でアラート
- **レスポンス時間**: 2秒以上でアラート

#### ユーザー監視
- **高使用量ユーザー**: 50MB/月で通知
- **非アクティブユーザー**: 30日で通知
- **プラン制限超過**: 即座にアラート

### 5. パフォーマンス最適化

#### データベース最適化
```sql
-- パーティショニング（大量データ用）
CREATE TABLE monthly_data_2024 PARTITION OF monthly_data
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 統計情報の更新
ANALYZE monthly_data;
ANALYZE users;
ANALYZE usage_tracking;
```

#### キャッシュ戦略
- **静的データ**: 24時間キャッシュ
- **ユーザーデータ**: 5分キャッシュ
- **分析データ**: 1時間キャッシュ
- **APIレスポンス**: 1分キャッシュ

### 6. セキュリティ設定

#### Supabase RLS
```sql
-- 追加のセキュリティポリシー
CREATE POLICY "Prevent data leakage" ON monthly_data
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
```

#### API セキュリティ
- **レート制限**: ユーザーあたり100回/分
- **認証**: JWT トークン必須
- **CORS**: 許可ドメインのみ
- **入力検証**: 全APIで必須

### 7. バックアップ・災害復旧

#### データベースバックアップ
```bash
# 日次バックアップ
pg_dump -h your-host -U your-user your-database > backup_$(date +%Y%m%d).sql

# 週次フルバックアップ
pg_dump -h your-host -U your-user --clean --create your-database > weekly_backup_$(date +%Y%m%d).sql
```

#### 災害復旧計画
1. **RTO**: 4時間以内
2. **RPO**: 1時間以内
3. **バックアップ保持**: 30日間
4. **復旧テスト**: 月次実施

### 8. スケーリング計画

#### ユーザー数別対応
- **0-100ユーザー**: 現在の設定で対応可能
- **100-1000ユーザー**: Redis導入、CDN設定
- **1000-10000ユーザー**: データベースクラスタ、ロードバランサー
- **10000+ユーザー**: マイクロサービス化、Kubernetes

#### コスト最適化
- **Vercel Pro**: $20/月（推奨）
- **Supabase Pro**: $25/月（推奨）
- **Redis**: $10/月（必要時）
- **監視ツール**: $20/月（推奨）

### 9. 運用チェックリスト

#### 日次チェック
- [ ] システム監視ダッシュボード確認
- [ ] エラーログ確認
- [ ] 使用量統計確認
- [ ] バックアップ完了確認

#### 週次チェック
- [ ] パフォーマンスメトリクス確認
- [ ] セキュリティログ確認
- [ ] ユーザーフィードバック確認
- [ ] コスト分析

#### 月次チェック
- [ ] 災害復旧テスト
- [ ] セキュリティ監査
- [ ] パフォーマンス最適化
- [ ] 機能アップデート計画

### 10. トラブルシューティング

#### よくある問題と解決策

**問題**: データ転送量超過
**解決策**: 
1. プランアップグレード
2. データサイズ制限の実装
3. キャッシュ戦略の見直し

**問題**: API呼び出し制限超過
**解決策**:
1. レート制限の調整
2. バッチ処理の実装
3. キャッシュの活用

**問題**: レスポンス時間の遅延
**解決策**:
1. データベースインデックスの最適化
2. クエリの最適化
3. CDNの導入

### 11. 連絡先・サポート

#### 緊急時連絡先
- **技術サポート**: tech-support@yourcompany.com
- **システム管理者**: admin@yourcompany.com
- **緊急連絡**: +81-XX-XXXX-XXXX

#### ドキュメント
- **API仕様書**: /docs/api
- **ユーザーマニュアル**: /docs/user-guide
- **管理者マニュアル**: /docs/admin-guide

---

## 📊 運用開始後の監視項目

### 重要なメトリクス
1. **可用性**: 99.9%以上
2. **レスポンス時間**: 平均2秒以内
3. **エラー率**: 1%以下
4. **データ整合性**: 100%

### アラート設定
- **システムダウン**: 即座に通知
- **高負荷**: 5分以内に通知
- **セキュリティ侵害**: 即座に通知
- **データ損失**: 即座に通知

この設定により、SaaSとして本格運用が可能になります。

