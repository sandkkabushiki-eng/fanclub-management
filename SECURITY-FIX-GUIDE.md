# Supabaseセキュリティ警告の修正ガイド

## 📋 概要
Supabaseセキュリティアドバイザーから以下の警告が出ています：

1. ✅ **関数検索パスは変更可能** (2件) - SQLで修正可能
2. ⚠️ **漏洩したパスワード保護が無効** (1件) - Dashboard設定が必要

---

## 🔧 修正手順

### ステップ1: SQLスクリプトの実行

1. Supabase Dashboardにログイン
   - URL: https://supabase.com/dashboard
   
2. プロジェクトを選択
   - プロジェクトID: `aksptiaptxogdipuysut`
   - プロジェクト名: `sandkkabushiki-engのプロジェクト`

3. SQL Editorを開く
   - 左サイドバー → **SQL Editor**

4. `fix-supabase-security-warnings.sql` の内容をコピー&ペースト

5. **Run** ボタンをクリックして実行

6. 成功メッセージを確認
   ```
   ✅ セキュリティ警告の修正が完了しました
   ```

---

### ステップ2: 漏洩パスワード保護の有効化

この設定はSupabase Dashboardから手動で行う必要があります。

1. Supabase Dashboardで **Authentication** を開く
   - 左サイドバー → **Authentication**

2. **Policies** タブをクリック

3. **Password Protection** セクションを探す

4. **"Enable leaked password protection"** をONにする
   - このオプションは、既知の漏洩パスワードデータベースと照合し、
     危険なパスワードの使用を防ぎます

5. 設定を保存

---

### ステップ3: セキュリティアドバイザーで確認

1. Supabase Dashboard → **Security Advisor**

2. 警告が消えていることを確認
   - 「6件のエラー」→「0件のエラー」になるはず

3. まだ警告が残っている場合：
   - 数分待ってからリフレッシュ
   - それでも残る場合は、エラー内容を確認して追加対応

---

## 🔒 修正内容の詳細

### 1. 関数検索パス (search_path) の固定

**問題点:**
- `create_admin_user` 関数と `handle_new_user` 関数で `search_path` が固定されていない
- 悪意のあるユーザーが検索パスを変更して、不正な関数を実行できる可能性

**修正内容:**
```sql
CREATE OR REPLACE FUNCTION public.create_admin_user(...)
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔒 検索パスを固定
AS $$
...
$$;
```

**効果:**
- 関数実行時の検索パスが `public, pg_temp` に固定される
- 不正なスキーマからの関数実行を防止

---

### 2. 漏洩パスワード保護

**問題点:**
- 既知の漏洩パスワードのチェックが無効
- ユーザーが危険なパスワードを設定できてしまう

**修正内容:**
- Dashboard設定で有効化

**効果:**
- Have I Been Pwned などのデータベースと照合
- 漏洩が確認されているパスワードの使用を防止

---

### 3. RLSポリシーの再確認

すべてのテーブルで以下を確認：
- ✅ RLS (Row Level Security) が有効
- ✅ 各ユーザーは自分のデータのみアクセス可能
- ✅ `auth.uid()` による厳格な認証チェック

---

## 📊 セキュリティチェックリスト

修正後、以下を確認してください：

- [ ] SQLスクリプトが正常に実行された
- [ ] 漏洩パスワード保護が有効になっている
- [ ] セキュリティアドバイザーで警告が0件になった
- [ ] アプリケーションが正常に動作している
- [ ] ユーザー登録・ログインが正常に動作している
- [ ] データの読み書きが正常に動作している

---

## 🆘 トラブルシューティング

### エラー: "permission denied for function"

**原因:** 関数の権限設定が正しくない

**解決策:**
```sql
GRANT EXECUTE ON FUNCTION public.create_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
```

### エラー: "function does not exist"

**原因:** 関数が正しく作成されていない

**解決策:**
1. `fix-supabase-security-warnings.sql` を再実行
2. エラーメッセージを確認
3. 必要に応じて既存の関数を手動削除してから再実行

### 警告が消えない

**原因:** セキュリティアドバイザーの更新に時間がかかる

**解決策:**
1. 5-10分待つ
2. ページをリフレッシュ
3. それでも消えない場合は、Supabaseサポートに問い合わせ

---

## 📚 参考資料

- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security.html)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ 完了後

すべての修正が完了したら、このファイルを保存して、次回のセキュリティレビューの参考にしてください。

**最終更新:** 2025年10月29日

