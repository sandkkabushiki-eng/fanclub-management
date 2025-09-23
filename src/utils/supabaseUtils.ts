import { supabase } from '@/lib/supabase';
import { Model, ModelMonthlyData, FanClubRevenueData } from '@/types/csv';
import { analyzeFanClubRevenue } from './csvUtils';

// モデル管理
export const saveModelToSupabase = async (model: Model): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('models')
      .upsert({
        id: model.id,
        name: model.name,
        display_name: model.displayName,
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

export const deleteModelFromSupabase = async (modelId: string): Promise<boolean> => {
  try {
    // 関連する月別データも削除
    await supabase
      .from('monthly_data')
      .delete()
      .eq('model_id', modelId);

    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (error) {
      console.error('Error deleting model:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting model:', error);
    return false;
  }
};

// 月別データ管理
export const saveModelMonthlyDataToSupabase = async (
  modelId: string,
  year: number,
  month: number,
  data: FanClubRevenueData[]
): Promise<boolean> => {
  try {
    const analysis = analyzeFanClubRevenue(data);
    
    const { error } = await supabase
      .from('monthly_data')
      .upsert({
        model_id: modelId,
        year,
        month,
        data,
        analysis,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving monthly data:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving monthly data:', error);
    return false;
  }
};

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
      modelName: '', // 後でモデル名を取得
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
      console.error('Error deleting monthly data:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting monthly data:', error);
    return false;
  }
};

// データ同期（ローカルストレージからSupabaseへ）
export const syncLocalDataToSupabase = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // ローカルストレージからデータを取得
    const localModels = JSON.parse(localStorage.getItem('fanclub-models') || '[]');
    const localModelData = JSON.parse(localStorage.getItem('fanclub-model-data') || '[]');

    // モデルを同期
    for (const model of localModels) {
      await saveModelToSupabase(model);
    }

    // 月別データを同期
    for (const data of localModelData) {
      await saveModelMonthlyDataToSupabase(
        data.modelId,
        data.year,
        data.month,
        data.data
      );
    }

    return {
      success: true,
      message: `同期完了: モデル${localModels.length}件、月別データ${localModelData.length}件`
    };
  } catch (error) {
    return {
      success: false,
      message: `同期エラー: ${error}`
    };
  }
};

// データ同期（Supabaseからローカルストレージへ）
export const syncSupabaseDataToLocal = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const models = await getModelsFromSupabase();
    const modelData = await getModelMonthlyDataFromSupabase();

    // ローカルストレージに保存
    localStorage.setItem('fanclub-models', JSON.stringify(models));
    localStorage.setItem('fanclub-model-data', JSON.stringify(modelData));

    return {
      success: true,
      message: `同期完了: モデル${models.length}件、月別データ${modelData.length}件`
    };
  } catch (error) {
    return {
      success: false,
      message: `同期エラー: ${error}`
    };
  }
};
