import { supabase } from '@/lib/supabase';
import { Model, ModelMonthlyData, FanClubRevenueData } from '@/types/csv';
import { analyzeFanClubRevenue } from './csvUtils';

// モデルをSupabaseに保存
export const saveModelToSupabase = async (model: Model, userId?: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;

    const { error } = await supabase
      .from('models')
      .upsert({
        id: model.id,
        name: model.name,
        display_name: model.displayName,
        is_main_model: model.isMainModel || false,
        user_id: currentUserId,
        created_at: model.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Supabaseへのモデル保存をスキップ（開発中はローカルストレージのみ使用）:', error.message || error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Supabaseへのモデル保存をスキップ（開発中はローカルストレージのみ使用）');
    return false;
  }
};

// 月別データをSupabaseに保存
export const saveModelMonthlyDataToSupabase = async (
  modelId: string,
  modelName: string,
  year: number,
  month: number,
  data: FanClubRevenueData[],
  userId?: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    // データが配列であることを確認
    if (!Array.isArray(data)) {
      console.error('Data is not an array:', data);
      return false;
    }
    
    const analysis = analyzeFanClubRevenue(data);
    
    // 既存のデータがあるかチェック（セキュリティ: 自分のデータのみ）
    const { data: existingData, error: fetchError } = await supabase
      .from('monthly_data')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('model_id', modelId)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing monthly data:', fetchError);
      return false;
    }

    if (existingData) {
      // 既存データを更新（セキュリティ: 自分のデータのみ更新）
      const { error } = await supabase
        .from('monthly_data')
        .update({
          data,
          analysis,
          user_id: currentUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error updating monthly data:', error);
        return false;
      }
    } else {
      // 新規データを挿入
      const { error } = await supabase
        .from('monthly_data')
        .insert({
          model_id: modelId,
          user_id: currentUserId,
          year,
          month,
          data,
          analysis,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error inserting monthly data:', error);
        return false;
      }
    }
    
    console.log('Monthly data saved to Supabase successfully');
    return true;
  } catch (error) {
    console.error('Error saving monthly data:', error);
    return false;
  }
};

// Supabaseからモデル一覧を取得
export const getModelsFromSupabase = async (userId?: string): Promise<Model[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      console.error('🔒 ユーザーが認証されていません');
      return [];
    }
    
    // セキュリティ: 自分のモデルのみ取得
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching models:', error);
      return [];
    }

    console.log('🔒 ユーザー固有のモデルを取得:', data?.length || 0, '件');

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      isMainModel: row.is_main_model || false,
      status: 'active' as const,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};

// Supabaseから月別データを取得
export const getModelMonthlyDataFromSupabase = async (userId?: string): Promise<ModelMonthlyData[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      console.error('🔒 ユーザーが認証されていません');
      return [];
    }
    
    // セキュリティ: 自分のデータのみ取得
    const { data, error } = await supabase
      .from('monthly_data')
      .select('*')
      .eq('user_id', currentUserId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching monthly data:', error);
      return [];
    }

    console.log('🔒 ユーザー固有の月別データを取得:', data?.length || 0, '件');

    return (data || []).map(row => ({
      id: row.id,
      modelId: row.model_id,
      modelName: '',
      year: row.year,
      month: row.month,
      data: row.data as FanClubRevenueData[],
      analysis: row.analysis,
      uploadedAt: row.created_at,
      lastModified: row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return [];
  }
};

// Supabaseからモデルを削除
export const deleteModelFromSupabase = async (modelId: string, userId?: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      console.error('🔒 ユーザーが認証されていません');
      return false;
    }
    
    // セキュリティ: 自分のモデルのみ削除
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Error deleting model from Supabase:', error);
      return false;
    }
    
    console.log('🔒 ユーザー固有のモデルを削除しました');
    return true;
  } catch (error) {
    console.error('Error deleting model:', error);
    return false;
  }
};

// Supabaseから月別データを削除
export const deleteModelMonthlyDataFromSupabase = async (
  modelId: string,
  year: number,
  month: number,
  userId?: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      console.error('🔒 ユーザーが認証されていません');
      return false;
    }
    
    // セキュリティ: 自分のデータのみ削除
    const { error } = await supabase
      .from('monthly_data')
      .delete()
      .eq('user_id', currentUserId)
      .eq('model_id', modelId)
      .eq('year', year)
      .eq('month', month);

    if (error) {
      console.error('Error deleting monthly data from Supabase:', error);
      return false;
    }
    
    console.log('🔒 ユーザー固有のデータを削除しました');
    return true;
  } catch (error) {
    console.error('Error deleting monthly data:', error);
    return false;
  }
};