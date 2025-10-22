# ファンクラブ管理アプリ

ファンクラブの売上データを管理・分析するためのWebアプリケーションです。

## 機能

- 📊 **ダッシュボード**: 売上統計とモデル別分析
- 👥 **ファン管理**: リピーター顧客の詳細分析
- 📈 **売上分析**: 月別・時間別の売上パターン分析
- 📅 **カレンダー分析**: 購入タイミングの可視化
- 🎭 **モデル管理**: ファンクラブモデルの管理
- 📁 **CSVデータ管理**: 売上データのアップロード・編集

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (認証・データベース)
- **決済**: Stripe (オプション)
- **デプロイ**: Netlify

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd fanclub-management
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`env.example`を参考に環境変数を設定してください：

```bash
cp env.example .env.local
```

必要な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## デプロイ

### Netlifyでのデプロイ

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Deploy to Netlify"
   git push origin main
   ```

2. **Netlifyでプロジェクトを作成**
   - [Netlify](https://netlify.com)にアクセス
   - "New site from Git"を選択
   - GitHubリポジトリを選択

3. **ビルド設定**
   - Build command: `npm run build`
   - Publish directory: `out`
   - Node version: `18`

4. **環境変数の設定**
   - Netlifyのダッシュボードで環境変数を設定
   - `env.example`の内容を参考に設定

5. **デプロイ**
   - "Deploy site"をクリック
   - ビルドが完了すると自動的にデプロイされます

### 手動デプロイ

```bash
# ビルド
npm run build

# 静的ファイルを生成
npm run export

# outディレクトリをNetlifyにアップロード
```

## 使用方法

1. **アカウント作成**: 初回アクセス時にアカウントを作成
2. **CSVデータアップロード**: 売上データをCSV形式でアップロード
3. **モデル管理**: ファンクラブモデルを追加・編集
4. **データ分析**: ダッシュボードで売上分析を確認

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
