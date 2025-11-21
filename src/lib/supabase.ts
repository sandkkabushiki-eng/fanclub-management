import { createClient } from '@supabase/supabase-js'

// Supabaseの設定（環境変数から取得、フォールバックなしでセキュリティを確保）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 接続テスト用の関数
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('models').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};