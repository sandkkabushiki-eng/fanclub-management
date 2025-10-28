import { useState, useEffect } from 'react';
import { Model } from '@/types/csv';

interface GlobalModelSelection {
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  models: Model[];
  setModels: (models: Model[]) => void;
  mainModel: Model | null;
}

// グローバル状態を管理するためのストレージキー
const GLOBAL_MODEL_SELECTION_KEY = 'fanclub-global-model-selection';

// グローバル状態を管理するカスタムフック
export const useGlobalModelSelection = (): GlobalModelSelection => {
  const [selectedModelId, setSelectedModelIdState] = useState<string>('');
  const [models, setModelsState] = useState<Model[]>([]);

  // ローカルストレージから状態を復元
  useEffect(() => {
    const savedSelection = localStorage.getItem(GLOBAL_MODEL_SELECTION_KEY);
    if (savedSelection) {
      try {
        const { selectedModelId: savedModelId } = JSON.parse(savedSelection);
        if (savedModelId) {
          setSelectedModelIdState(savedModelId);
        }
      } catch (error) {
        console.warn('Failed to parse saved model selection:', error);
      }
    }
  }, []);

  // 選択されたモデルIDを更新し、ローカルストレージに保存
  const setSelectedModelId = (modelId: string) => {
    console.log('🌍 グローバル状態: モデル選択変更:', modelId);
    setSelectedModelIdState(modelId);
    localStorage.setItem(GLOBAL_MODEL_SELECTION_KEY, JSON.stringify({ selectedModelId: modelId }));
    
    // 他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
      detail: { selectedModelId: modelId } 
    }));
  };

  // モデルリストを更新
  const setModels = (newModels: Model[]) => {
    console.log('🌍 グローバル状態: モデルリスト更新:', newModels.length, '件');
    setModelsState(newModels);
    
    // 現在の選択が有効でない場合のみ更新
    const currentSelectionValid = selectedModelId && newModels.find(m => m.id === selectedModelId);
    
    if (!currentSelectionValid && newModels.length > 0) {
      // メインモデルを優先して選択
      const mainModel = newModels.find(m => m.isMainModel);
      const newSelectedId = mainModel ? mainModel.id : newModels[0].id;
      
      console.log('🌍 グローバル状態: 新しいモデルを選択:', newSelectedId);
      
      // 状態を直接更新（イベント発火を避ける）
      setSelectedModelIdState(newSelectedId);
      localStorage.setItem(GLOBAL_MODEL_SELECTION_KEY, JSON.stringify({ selectedModelId: newSelectedId }));
      
      // イベントは一度だけ発火
      window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
        detail: { selectedModelId: newSelectedId } 
      }));
    } else {
      console.log('🌍 グローバル状態: 現在の選択を維持:', selectedModelId);
    }
  };

  // メインモデルを取得
  const mainModel = models.find(m => m.isMainModel) || null;

  return {
    selectedModelId,
    setSelectedModelId,
    models,
    setModels,
    mainModel
  };
};

// グローバルモデル選択変更イベントをリッスンするフック
export const useGlobalModelSelectionListener = (
  onSelectionChange: (selectedModelId: string) => void
) => {
  useEffect(() => {
    const handleGlobalModelSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { selectedModelId } = customEvent.detail;
      console.log('🌍 グローバル状態リスナー: イベント受信:', selectedModelId);
      onSelectionChange(selectedModelId);
    };

    window.addEventListener('globalModelSelectionChanged', handleGlobalModelSelectionChange);
    
    return () => {
      window.removeEventListener('globalModelSelectionChanged', handleGlobalModelSelectionChange);
    };
  }, [onSelectionChange]); // onSelectionChangeを依存配列に追加
};
