# Supabaseセットアップ手順

## 1. Supabaseプロジェクトの作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでログイン
4. 「New project」をクリック
5. プロジェクト名を入力（例：fanclub-management）
6. データベースパスワードを設定
7. リージョンを選択（Asia Northeast (Tokyo)推奨）
8. 「Create new project」をクリック

## 2. データベーステーブルの作成

プロジェクトが作成されたら、SQL Editorで以下のSQLを実行してください：

```sql
-- モデルテーブル
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 月別データテーブル
CREATE TABLE monthly_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  data JSONB NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, year, month)
);

-- インデックスの作成
CREATE INDEX idx_monthly_data_model_id ON monthly_data(model_id);
CREATE INDEX idx_monthly_data_year_month ON monthly_data(year, month);
```

## 3. 環境変数の設定

1. Supabaseダッシュボードの「Settings」→「API」に移動
2. 「Project URL」と「anon public」キーをコピー
3. プロジェクトルートに `.env.local` ファイルを作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. アプリケーションの設定

環境変数を設定後、アプリケーションを再起動してください：

```bash
npm run dev
```

## 5. データ同期の使用方法

1. 「クラウド同期」タブを開く
2. 初回は「クラウドにアップロード」をクリック
3. 以降はデータ更新時にアップロード、最新データ取得時にダウンロード

## 注意事項

- 無料プランでは月間50,000リクエストまで
- データは自動的にバックアップされます
- 複数人で使用する場合は、データ更新時に必ずアップロードしてください
