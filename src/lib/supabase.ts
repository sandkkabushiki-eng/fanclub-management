import { createClient } from '@supabase/supabase-js'

// Supabaseの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aksptiaptxogdipuysut.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTIzMjMsImV4cCI6MjA3NDE4ODMyM30.56TBLIIvYIk5R4Moyhe2PluQMTq7gZ51suXFesrkULA'

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