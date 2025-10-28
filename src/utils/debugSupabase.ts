// デバッグ用のSupabase接続テスト
import { supabase } from '@/lib/supabase';

export async function debugSupabaseConnection() {
  console.log('🔍 Supabase接続デバッグ開始');
  
  try {
    // 1. 認証状況確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 認証状況:', user ? `認証済み (${user.email})` : '未認証');
    if (authError) console.error('認証エラー:', authError);
    
    // 2. テーブル存在確認
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('count')
      .limit(1);
    console.log('📊 modelsテーブル:', modelsError ? `エラー: ${modelsError.message}` : 'アクセス可能');
    
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('monthly_data')
      .select('count')
      .limit(1);
    console.log('📊 monthly_dataテーブル:', monthlyError ? `エラー: ${monthlyError.message}` : 'アクセス可能');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    console.log('📊 usersテーブル:', usersError ? `エラー: ${usersError.message}` : 'アクセス可能');
    
    // 3. 現在のデータ数確認
    if (!modelsError) {
      const { count: modelsCount } = await supabase
        .from('models')
        .select('*', { count: 'exact', head: true });
      console.log('📈 modelsテーブルのレコード数:', modelsCount);
    }
    
    if (!monthlyError) {
      const { count: monthlyCount } = await supabase
        .from('monthly_data')
        .select('*', { count: 'exact', head: true });
      console.log('📈 monthly_dataテーブルのレコード数:', monthlyCount);
    }
    
    if (!usersError) {
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      console.log('📈 usersテーブルのレコード数:', usersCount);
    }
    
    return {
      authenticated: !!user,
      user: user,
      tablesAccessible: {
        models: !modelsError,
        monthly_data: !monthlyError,
        users: !usersError
      },
      errors: {
        auth: authError,
        models: modelsError,
        monthly_data: monthlyError,
        users: usersError
      }
    };
    
  } catch (error) {
    console.error('🔍 デバッグエラー:', error);
    return { error };
  }
}

