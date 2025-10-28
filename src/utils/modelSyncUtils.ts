// 既存のローカルモデルをSupabaseに同期する関数
export const syncLocalModelsToSupabase = async () => {
  try {
    console.log('🔄 ローカルモデルをSupabaseに同期開始');
    
    const { getModels } = await import('@/utils/modelUtils');
    const { saveModelToSupabase } = await import('@/utils/supabaseUtils');
    
    const localModels = getModels();
    console.log('📋 ローカルモデル数:', localModels.length);
    
    let syncedCount = 0;
    for (const model of localModels) {
      try {
        const success = await saveModelToSupabase(model);
        if (success) {
          syncedCount++;
          console.log('✅ モデル同期成功:', model.displayName);
        } else {
          console.warn('⚠️ モデル同期失敗:', model.displayName);
        }
      } catch (error) {
        console.error('❌ モデル同期エラー:', model.displayName, error);
      }
    }
    
    console.log(`🔄 同期完了: ${syncedCount}/${localModels.length}件`);
    return syncedCount;
  } catch (error) {
    console.error('❌ モデル同期エラー:', error);
    return 0;
  }
};

