#!/bin/bash

# Vercel環境変数設定スクリプト
# このスクリプトを実行すると、必要な環境変数が自動で設定されます

echo "Vercel環境変数を設定しています..."

# 環境変数を設定
vercel env add ADMIN_EMAIL <<< "shokei0402@gmail.com"
vercel env add ADMIN_PASSWORD <<< "shokei20030402"
vercel env add NEXT_PUBLIC_SUPABASE_URL <<< "https://aksptiaptxogdipuysut.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTIzMjMsImV4cCI6MjA3NDE4ODMyM30.56TBLIIvYIk5R4Moyhe2PluQMTq7gZ51suXFesrkULA"
vercel env add NEXT_PUBLIC_ADMIN_SUPABASE_URL <<< "https://aksptiaptxogdipuysut.supabase.co"
vercel env add NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMjMyMywiZXhwIjoyMDc0MTg4MzIzfQ.EpJsXq17uDoqlr7rP0HY4yv0zSEhS9OiCGgHTHFHHmI"

echo "環境変数の設定が完了しました！"
echo "次にデプロイを実行します..."

# デプロイを実行
vercel --prod

echo "デプロイが完了しました！"





