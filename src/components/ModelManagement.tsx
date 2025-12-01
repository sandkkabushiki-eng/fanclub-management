'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Star } from 'lucide-react';
import { Model } from '@/types/csv';
import { getModels, addModel, updateModel, deleteModel } from '@/utils/modelUtils';
import { getCurrentUserDataManager } from '@/utils/userDataUtils';

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: ''
  });

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading models for model management...');
        
        // ユーザーデータマネージャーを取得
        const userDataManager = getCurrentUserDataManager();
        console.log('User data manager:', userDataManager ? 'Found' : 'Not found');
        
        if (userDataManager) {
          // ユーザー専用のモデルデータを取得
          const userModels = await userDataManager.getUserModels();
          console.log('Found user models:', userModels.length, userModels);
          
          if (userModels.length > 0) {
            setModels(userModels);
          } else {
            // ユーザー専用データが空の場合は、ローカルストレージからも取得
            console.log('No user models found, checking local storage...');
            const localModels = getModels();
            console.log('Local models found:', localModels.length, localModels);
            setModels(localModels);
          }
        } else {
          // フォールバック: ローカルストレージから取得
          console.log('No user session, using local storage');
          const localModels = getModels();
          console.log('Local models:', localModels.length, localModels);
          setModels(localModels);
        }
      } catch (error) {
        console.error('Error loading models:', error);
        const localModels = getModels();
        console.log('Fallback to local models:', localModels.length, localModels);
        setModels(localModels);
      }
    };

    loadModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        await updateModel(editingModel.id, formData.name, formData.displayName);
      } else {
        await addModel(formData.name, formData.displayName);
      }
      
      // データを再読み込み
      const userDataManager = getCurrentUserDataManager();
      if (userDataManager) {
        const userModels = await userDataManager.getUserModels();
        if (userModels.length > 0) {
          setModels(userModels);
        } else {
          setModels(getModels());
        }
      } else {
        setModels(getModels());
      }
      
      setShowForm(false);
      setEditingModel(null);
      setFormData({ name: '', displayName: '' });
    } catch (error) {
      console.error('Error saving model:', error);
      alert('モデルの保存中にエラーが発生しました。');
    }
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      displayName: model.displayName
    });
    setShowForm(true);
  };

  const handleSetMainModel = async (modelId: string) => {
    try {
      console.log('🌟 メインモデル設定開始:', modelId);
      
      // 全てのモデルのisMainModelをfalseにして、選択されたモデルだけtrueにする
      const updatedModels = models.map(model => ({
        ...model,
        isMainModel: model.id === modelId
      }));
      
      console.log('📋 更新後のモデル一覧:', updatedModels.map(m => ({ id: m.id, name: m.displayName, isMain: m.isMainModel })));
      
      // 各モデルを更新（Supabaseにも保存）
      for (const model of updatedModels) {
        console.log('💾 モデル更新中:', model.id, model.displayName, 'isMain:', model.isMainModel);
        await updateModel(model.id, model);
      }
      
      setModels(updatedModels);
      
      // 他のコンポーネントに通知するためにカスタムイベントを発火
      console.log('🌟 メインモデル変更イベント発火:', modelId);
      window.dispatchEvent(new CustomEvent('mainModelChanged', { detail: { modelId } }));
      
      // 成功メッセージ
      alert(`「${updatedModels.find(m => m.id === modelId)?.displayName}」をメインモデルに設定しました！`);
    } catch (error) {
      console.error('Error setting main model:', error);
      alert('メインモデルの設定中にエラーが発生しました。');
    }
  };

  const handleUnsetMainModel = async () => {
    try {
      console.log('🌟 メインモデル設定解除開始');
      
      // 全てのモデルのisMainModelをfalseにする
      const updatedModels = models.map(model => ({
        ...model,
        isMainModel: false
      }));
      
      console.log('📋 更新後のモデル一覧:', updatedModels.map(m => ({ id: m.id, name: m.displayName, isMain: m.isMainModel })));
      
      // 各モデルを更新（Supabaseにも保存）
      for (const model of updatedModels) {
        console.log('💾 モデル更新中:', model.id, model.displayName, 'isMain:', model.isMainModel);
        await updateModel(model.id, model);
      }
      
      setModels(updatedModels);
      
      // 他のコンポーネントに通知するためにカスタムイベントを発火
      console.log('🌟 メインモデル解除イベント発火');
      window.dispatchEvent(new CustomEvent('mainModelChanged', { detail: { modelId: null } }));
      
      // 成功メッセージ
      alert('メインモデルの設定を解除しました！');
    } catch (error) {
      console.error('Error unsetting main model:', error);
      alert('メインモデルの設定解除中にエラーが発生しました。');
    }
  };

  const handleDelete = async (modelId: string) => {
    if (confirm('このモデルを削除しますか？')) {
      try {
        await deleteModel(modelId);
        
        // データを再読み込み
        const userDataManager = getCurrentUserDataManager();
        if (userDataManager) {
          const userModels = await userDataManager.getUserModels();
          if (userModels.length > 0) {
            setModels(userModels);
          } else {
            setModels(getModels());
          }
        } else {
          setModels(getModels());
        }
      } catch (error) {
        console.error('Error deleting model:', error);
        alert('モデルの削除中にエラーが発生しました。');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingModel(null);
    setFormData({ name: '', displayName: '' });
  };

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-gray-600">モデルの追加・編集・削除を行います</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">新規追加</span>
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingModel ? 'モデル編集' : '新規モデル追加'}
              </h3>
              <p className="text-gray-600 text-sm">
                {editingModel ? 'モデル情報を編集します' : '新しいモデルを追加します'}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  モデル名（ID）
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white"
                  placeholder="例: model1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  表示名
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white"
                  placeholder="モデル名を入力"
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {editingModel ? '更新する' : '追加する'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold border-2 border-gray-200 hover:border-gray-300"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* モデル一覧 */}
      {models.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">モデルがありません</h3>
          <p className="text-gray-600 mb-6">新しいモデルを追加して始めましょう</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            最初のモデルを追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.id} className={`bg-white border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group ${
              model.isMainModel ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-white' : 'border-gray-200'
            }`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 ${
                  model.isMainModel 
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                    : 'bg-gradient-to-br from-pink-500 to-pink-600'
                }`}>
                  {model.isMainModel ? (
                    <Star className="h-6 w-6 text-white" />
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-900 text-lg">{model.displayName}</h3>
                    {model.isMainModel && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                        メイン
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{model.name}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(model)}
                  className="flex-1 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Edit className="h-4 w-4 text-gray-900" />
                  <span>編集</span>
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="flex-1 border border-gray-300 hover:border-red-300 hover:bg-red-50 text-gray-900 hover:text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4 text-gray-900" />
                  <span>削除</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}