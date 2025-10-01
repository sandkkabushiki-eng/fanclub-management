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
        user_id: currentUserId,
        created_at: model.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving model:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving model:', error);
    return false;
  }
};

// 月別データをSupabaseに保存
export const saveModelMonthlyDataToSupabase = async (
  modelId: string,
  year: number,
  month: number,
  data: FanClubRevenueData[],
  userId?: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    const analysis = analyzeFanClubRevenue(data);
    
    // 既存のデータがあるかチェック
    const { data: existingData, error: fetchError } = await supabase
      .from('monthly_data')
      .select('id')
      .eq('model_id', modelId)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing monthly data:', fetchError);
      return false;
    }

    if (existingData) {
      // 既存データを更新
      const { error } = await supabase
        .from('monthly_data')
        .update({
          data,
          analysis,
          user_id: currentUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);

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
export const getModelsFromSupabase = async (): Promise<Model[]> => {
  try {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching models:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
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
export const getModelMonthlyDataFromSupabase = async (): Promise<ModelMonthlyData[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_data')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching monthly data:', error);
      return [];
    }

    return data.map(row => ({
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
export const deleteModelFromSupabase = async (modelId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (error) {
      console.error('Error deleting model from Supabase:', error);
      return false;
    }
    
    console.log('Model deleted from Supabase successfully');
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
  month: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('monthly_data')
      .delete()
      .eq('model_id', modelId)
      .eq('year', year)
      .eq('month', month);

    if (error) {
      console.error('Error deleting monthly data from Supabase:', error);
      return false;
    }
    
    console.log('Monthly data deleted from Supabase successfully');
    return true;
  } catch (error) {
    console.error('Error deleting monthly data:', error);
    return false;
  }
};