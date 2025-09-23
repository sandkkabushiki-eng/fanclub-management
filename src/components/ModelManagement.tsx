'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { Model } from '@/types/csv';
import { getModels, addModel, updateModel, deleteModel } from '@/utils/modelUtils';

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: ''
  });

  useEffect(() => {
    setModels(getModels());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingModel) {
      updateModel(editingModel.id, {
        ...editingModel,
        name: formData.name,
        displayName: formData.displayName
      });
    } else {
      addModel(formData.name, formData.displayName);
    }
    
    setModels(getModels());
    setShowForm(false);
    setEditingModel(null);
    setFormData({ name: '', displayName: '' });
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      displayName: model.displayName
    });
    setShowForm(true);
  };

  const handleDelete = (modelId: string) => {
    if (confirm('このモデルを削除しますか？')) {
      deleteModel(modelId);
      setModels(getModels());
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingModel(null);
    setFormData({ name: '', displayName: '' });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-red-600">モデル管理</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新規追加</span>
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-gray-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingModel ? 'モデル編集' : '新規モデル追加'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                モデル名（ID）
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="例: model1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表示名
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="例: ののちゃん"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                {editingModel ? '更新' : '追加'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* モデル一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <div key={model.id} className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-3">
              <User className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{model.displayName}</h3>
                <p className="text-sm text-gray-500">{model.name}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(model)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>編集</span>
              </button>
              <button
                onClick={() => handleDelete(model.id)}
                className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>削除</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          モデルが登録されていません。
        </div>
      )}
    </div>
  );
}