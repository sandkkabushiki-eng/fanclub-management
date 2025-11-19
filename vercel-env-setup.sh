#!/bin/bash

# Vercel環境変数設定スクリプト（テンプレート）
# このスクリプトを実行する前に、.env.localファイルから実際の値を設定してください
# 機密情報は直接スクリプトに含めないでください

echo "Vercel環境変数を設定しています..."
echo "⚠️  警告: このスクリプトには機密情報が含まれていません。"
echo "実際の値を設定するには、以下のコマンドを手動で実行してください："
echo ""
echo "vercel env add ADMIN_EMAIL"
echo "vercel env add ADMIN_PASSWORD"
echo "vercel env add NEXT_PUBLIC_SUPABASE_URL"
echo "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "vercel env add SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "または、Vercelダッシュボードから環境変数を設定してください。"
echo ""
echo "環境変数の設定が完了したら、次を実行してください："
echo "vercel --prod"





