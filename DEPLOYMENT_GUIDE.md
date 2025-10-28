# GitHub Actions 自動デプロイ設定

## 概要
このプロジェクトはGitHub Actionsを使用してVercelに自動デプロイされます。

## 必要な設定

### 1. GitHub Secretsの設定
GitHubリポジトリのSettings > Secrets and variables > Actionsで以下のシークレットを設定してください：

- `VERCEL_TOKEN`: VercelのAPIトークン
- `VERCEL_ORG_ID`: Vercelの組織ID
- `VERCEL_PROJECT_ID`: VercelのプロジェクトID

### 2. Vercelトークンの取得方法
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. Settings > Tokens に移動
3. "Create Token" をクリック
4. トークン名を入力して作成
5. 生成されたトークンをコピーしてGitHub Secretsに設定

### 3. 組織IDとプロジェクトIDの取得方法
1. VercelプロジェクトのSettings > General に移動
2. "Project ID" をコピー
3. 組織IDは通常プロジェクトURLの一部として表示されます

## デプロイフロー

### 自動デプロイのトリガー
- `main`ブランチへのプッシュ
- `main`ブランチへのプルリクエスト

### デプロイプロセス
1. コードのチェックアウト
2. Node.js 18のセットアップ
3. 依存関係のインストール
4. リンティング実行
5. 型チェック実行
6. アプリケーションのビルド
7. Vercelへのデプロイ

## トラブルシューティング

### よくある問題
1. **Secretsが設定されていない**: GitHub Secretsに必要な値を設定してください
2. **ビルドエラー**: ローカルで`npm run build`が成功することを確認してください
3. **権限エラー**: Vercelトークンに適切な権限があることを確認してください

### ログの確認
GitHub Actionsのログは、リポジトリの"Actions"タブで確認できます。
