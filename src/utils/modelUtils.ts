import { Model, ModelMonthlyData, ModelRevenueSummary, FanClubRevenueData } from '@/types/csv';
import { analyzeFanClubRevenue } from './csvUtils';
import { saveModelToSupabase, deleteModelFromSupabase } from './supabaseUtils';
import { authManager } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { 
  getUserStorageKey, 
  validateUserAuthentication, 
  getSecureUserData, 
  saveSecureUserData 
} from './userDataIsolation';

const MODEL_STORAGE_KEY = 'fanclub-models';
const MODEL_DATA_STORAGE_KEY = 'fanclub-model-data';

// 🔥 Supabaseから直接モデルを取得（推奨）
export const getModelsFromSupabase = async (): Promise<Model[]> => {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser?.id) {
      console.warn('⚠️ 認証されていないユーザー - LocalStorageキャッシュを確認');
      // 認証されていない場合はキャッシュを返す
      const cachedModels = getSecureUserData<Model[]>(MODEL_STORAGE_KEY, []);
      console.log('📦 キャッシュから取得:', cachedModels.length, '件');
      return cachedModels;
    }
    
    console.log('🗄️ Supabaseからモデルを取得中... (userId:', currentUser.id, ')');
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabaseモデル取得エラー:', error);
      // エラーの場合はキャッシュから取得
      console.log('🔄 フォールバック: LocalStorageキャッシュから取得');
      const cachedModels = getSecureUserData<Model[]>(MODEL_STORAGE_KEY, []);
      console.log('📦 キャッシュから取得:', cachedModels.length, '件');
      return cachedModels;
    }
    
    const models = data || [];
    console.log('✅ Supabaseからモデルを取得:', models.length, '件');
    
    // Supabaseにデータがない場合、LocalStorageキャッシュを確認
    if (models.length === 0) {
      console.log('📭 Supabaseにモデルがありません。LocalStorageキャッシュを確認...');
      const cachedModels = getSecureUserData<Model[]>(MODEL_STORAGE_KEY, []);
      console.log('📦 キャッシュから取得:', cachedModels.length, '件');
      
      // キャッシュにデータがある場合、Supabaseに同期
      if (cachedModels.length > 0) {
        console.log('🔄 キャッシュをSupabaseに同期中...');
        for (const model of cachedModels) {
          try {
            await saveModelToSupabase(model);
          } catch (syncError) {
            console.error('同期エラー:', model.displayName, syncError);
          }
        }
        return cachedModels;
      }
    }
    
    // LocalStorageにキャッシュとして保存
    if (models.length > 0) {
      saveSecureUserData(MODEL_STORAGE_KEY, models);
      console.log('💾 LocalStorageにキャッシュを保存');
    }
    
    return models;
  } catch (error) {
    console.error('❌ Supabaseモデル取得エラー:', error);
    // エラーの場合はキャッシュから取得
    console.log('🔄 フォールバック: LocalStorageキャッシュから取得');
    const cachedModels = getSecureUserData<Model[]>(MODEL_STORAGE_KEY, []);
    console.log('📦 キャッシュから取得:', cachedModels.length, '件');
    return cachedModels;
  }
};

// モデル管理（LocalStorageはキャッシュのみ - Supabaseが真実のソース）
export const getModels = (): Model[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    if (!validateUserAuthentication()) {
      console.warn('⚠️ 認証されていないユーザー - 空の配列を返します');
      return [];
    }
    
    // LocalStorageからキャッシュを読み込み（高速化のため）
    const models = getSecureUserData<Model[]>(MODEL_STORAGE_KEY, []);
    console.log('📋 モデル取得（キャッシュ）:', models.length, '件');
    console.warn('⚠️ これはキャッシュです。最新データはSupabaseから取得してください。');
    return models;
  } catch (error) {
    console.error('Failed to load models:', error);
    return [];
  }
};

export const saveModels = (models: Model[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!validateUserAuthentication()) {
      console.error('🚨 セキュリティエラー: 認証されていないユーザーがモデルを保存しようとしました');
      return;
    }
    
    const success = saveSecureUserData(MODEL_STORAGE_KEY, models);
    if (success) {
      console.log('✅ モデルを安全に保存しました');
    }
  } catch (error) {
    console.error('Failed to save models:', error);
  }
};

export const addModel = async (name: string, displayName: string, description?: string): Promise<Model> => {
  console.log('➕ モデル追加開始:', displayName);
  
  const models = getModels();
  const newModel: Model = {
    id: Date.now().toString(),
    name,
    displayName,
    description,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  // まずSupabaseに保存（優先）
  try {
    console.log('🗄️ Supabaseにモデルを保存中...');
    const saved = await saveModelToSupabase(newModel);
    if (saved) {
      console.log('✅ Supabaseにモデルを保存成功:', displayName);
    } else {
      console.error('❌ Supabaseへの保存が失敗しました');
      throw new Error('Supabase save failed');
    }
  } catch (error) {
    console.error('❌ Supabaseモデル保存エラー:', error);
    throw error; // エラーを上位に投げる
  }
  
  // Supabase保存成功後、LocalStorageにキャッシュ
  models.push(newModel);
  saveModels(models);
  console.log('💾 LocalStorageにキャッシュを保存');
  
  return newModel;
};

export const updateModel = async (id: string, updateData: string | Partial<Model>, displayName?: string, description?: string, status?: 'active' | 'inactive'): Promise<boolean> => {
  console.log('🔧 updateModel呼び出し:', { id, updateData, displayName, description, status });
  const models = getModels();
  const index = models.findIndex(model => model.id === id);
  
  if (index === -1) {
    console.log('❌ モデルが見つかりません:', id);
    return false;
  }
  
  console.log('📋 更新前のモデル:', models[index]);
  
  let updatedModel: Model;
  
  // updateDataがオブジェクトの場合（Modelの部分更新）
  if (typeof updateData === 'object') {
    updatedModel = {
      ...models[index],
      ...updateData
    };
  } else {
    // updateDataが文字列の場合（従来の引数形式）
    updatedModel = {
      ...models[index],
      name: updateData,
      displayName: displayName || models[index].displayName,
      description,
      status: status || models[index].status
    };
  }
  
  models[index] = updatedModel;
  console.log('📋 更新後のモデル:', updatedModel);
  saveModels(models);
  console.log('💾 ローカルストレージに保存完了');
  
  // Supabaseにも更新（エラーが出ても続行）
  try {
    const saved = await saveModelToSupabase(updatedModel);
    if (saved) {
      console.log('✅ モデルをSupabaseに保存しました');
    } else {
      console.log('ℹ️ ローカルストレージに保存しました（Supabaseはオフライン）');
    }
  } catch (error) {
    console.log('ℹ️ ローカルストレージに保存しました（Supabaseはオフライン）');
    // Supabaseへの保存に失敗してもローカルストレージには保存されているのでtrueを返す
  }
  
  return true;
};

export const deleteModel = async (id: string): Promise<boolean> => {
  const models = getModels();
  const filtered = models.filter(model => model.id !== id);
  
  if (filtered.length === models.length) return false;
  
  saveModels(filtered);
  
  // 関連する売上データも削除
  const modelData = getModelMonthlyData();
  if (Array.isArray(modelData)) {
    const filteredData = modelData.filter(data => data.modelId !== id);
    saveModelMonthlyData(filteredData);
  }
  
  // Supabaseからも削除
  try {
    await deleteModelFromSupabase(id);
    console.log('Model deleted from Supabase successfully');
  } catch (error) {
    console.error('Failed to delete model from Supabase:', error);
  }
  
  return true;
};

// モデル別月別売上データ管理
export const getModelMonthlyData = (): ModelMonthlyData[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    if (!validateUserAuthentication()) {
      console.error('🚨 セキュリティエラー: 認証されていないユーザーが月別データにアクセスしようとしました');
      return [];
    }
    
    const data = getSecureUserData<ModelMonthlyData[]>(MODEL_DATA_STORAGE_KEY, []);
    
    // 配列でない場合は空配列を返す
    if (!Array.isArray(data)) {
      console.warn('Model monthly data is not an array, returning empty array');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load model monthly data:', error);
    return [];
  }
};

export const saveModelMonthlyData = (data: ModelMonthlyData[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!validateUserAuthentication()) {
      console.error('🚨 セキュリティエラー: 認証されていないユーザーが月別データを保存しようとしました');
      return;
    }
    
    const success = saveSecureUserData(MODEL_DATA_STORAGE_KEY, data);
    if (success) {
      console.log('✅ 月別データを安全に保存しました');
    }
  } catch (error) {
    console.error('Failed to save model monthly data:', error);
  }
};

export const getModelMonthlyDataByModelAndMonth = (modelId: string, year: number, month: number): ModelMonthlyData | null => {
  const allData = getModelMonthlyData();
  
  // 配列でない場合はnullを返す
  if (!Array.isArray(allData)) {
    console.warn('All data is not an array, returning null');
    return null;
  }
  
  return allData.find(data => data.modelId === modelId && data.year === year && data.month === month) || null;
};

export const upsertModelMonthlyData = (
  modelId: string,
  modelName: string,
  year: number,
  month: number,
  csvData: FanClubRevenueData[]
): ModelMonthlyData => {
  const allData = getModelMonthlyData();
  
  // 配列でない場合は空配列として扱う
  const safeAllData = Array.isArray(allData) ? allData : [];
  
  const existingIndex = safeAllData.findIndex(data => data.modelId === modelId && data.year === year && data.month === month);
  
  const analysis = analyzeFanClubRevenue(csvData);
  const now = new Date().toISOString();
  
  const modelMonthlyData: ModelMonthlyData = {
    id: existingIndex >= 0 ? safeAllData[existingIndex].id : Date.now().toString(),
    modelId,
    modelName,
    year,
    month,
    data: csvData,
    analysis,
    uploadedAt: existingIndex >= 0 ? safeAllData[existingIndex].uploadedAt : now,
    lastModified: now
  };
  
  if (existingIndex >= 0) {
    safeAllData[existingIndex] = modelMonthlyData;
  } else {
    safeAllData.push(modelMonthlyData);
  }
  
  // モデルID、年月でソート
  safeAllData.sort((a, b) => {
    if (a.modelId !== b.modelId) return a.modelId.localeCompare(b.modelId);
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  
  saveModelMonthlyData(safeAllData);
  return modelMonthlyData;
};

export const deleteModelMonthlyData = (modelId: string, year: number, month: number): boolean => {
  const allData = getModelMonthlyData();
  
  // 配列でない場合はfalseを返す
  if (!Array.isArray(allData)) {
    console.warn('All data is not an array, cannot delete');
    return false;
  }
  
  const filteredData = allData.filter(data => !(data.modelId === modelId && data.year === year && data.month === month));
  
  if (filteredData.length === allData.length) {
    return false; // データが見つからなかった
  }
  
  saveModelMonthlyData(filteredData);
  return true;
};

// モデル別売上サマリーを取得
export const getModelRevenueSummaries = (): ModelRevenueSummary[] => {
  const models = getModels();
  const allData = getModelMonthlyData();
  
  // 配列でない場合は空配列を返す
  if (!Array.isArray(allData)) {
    console.warn('All data is not an array, returning empty summaries');
    return [];
  }
  
  return models.map(model => {
    const modelData = allData.filter(data => data.modelId === model.id);
    
    const totalRevenue = modelData.reduce((sum, data) => sum + data.analysis.totalRevenue, 0);
    const totalFees = modelData.reduce((sum, data) => sum + data.analysis.totalFees, 0);
    const totalTransactions = modelData.reduce((sum, data) => sum + data.analysis.totalTransactions, 0);
    const planPurchases = modelData.reduce((sum, data) => sum + data.analysis.planPurchases, 0);
    const singlePurchases = modelData.reduce((sum, data) => sum + data.analysis.singlePurchases, 0);
    
    const monthlyData = modelData.map(data => ({
      year: data.year,
      month: data.month,
      revenue: data.analysis.totalRevenue,
      fees: data.analysis.totalFees,
      transactions: data.analysis.totalTransactions
    })).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    const lastActivity = modelData.length > 0 
      ? modelData.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0].lastModified
      : model.createdAt;
    
    return {
      modelId: model.id,
      modelName: model.displayName,
      totalRevenue,
      totalFees,
      totalTransactions,
      planPurchases,
      singlePurchases,
      monthlyData,
      lastActivity
    };
  });
};

// 特定のモデルの月別データを取得
export const getModelMonthlyDataByModel = (modelId: string): ModelMonthlyData[] => {
  const allData = getModelMonthlyData();
  
  // 配列でない場合は空配列を返す
  if (!Array.isArray(allData)) {
    console.warn('All data is not an array, returning empty array');
    return [];
  }
  
  return allData
    .filter(data => data.modelId === modelId)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
};

// 年月のラベルを生成
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}年${month}月`;
};
