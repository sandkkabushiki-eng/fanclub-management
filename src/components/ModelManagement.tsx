'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Calendar } from 'lucide-react';
import { Model, ModelRevenueSummary } from '@/types/csv';
import { getModels, addModel, updateModel, deleteModel, getModelRevenueSummaries, formatYearMonth } from '@/utils/modelUtils';

interface ModelManagementProps {
  onModelChange: () => void;
}

export default function ModelManagement({ onModelChange }: ModelManagementProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [modelSummaries, setModelSummaries] = useState<ModelRevenueSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  });

  useEffect(() => {
    setModels(getModels());
    setModelSummaries(getModelRevenueSummaries());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingModel) {
      // 更新
      const success = updateModel(editingModel.id, formData.name, formData.displayName, formData.description);
      if (success) {
        setModels(getModels());
        setModelSummaries(getModelRevenueSummaries());
        onModelChange();
      }
    } else {
      // 新規追加
      addModel(formData.name, formData.displayName, formData.description);
      setModels(getModels());
      setModelSummaries(getModelRevenueSummaries());
      onModelChange();
    }
    
    // フォームをリセット
    setFormData({ name: '', displayName: '', description: '' });
    setShowForm(false);
    setEditingModel(null);
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      displayName: model.displayName,
      description: model.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('このモデルを削除しますか？関連する売上データも削除されます。')) {
      deleteModel(id);
      setModels(getModels());
      setModelSummaries(getModelRevenueSummaries());
      onModelChange();
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', displayName: '', description: '' });
    setShowForm(false);
    setEditingModel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <User className="h-5 w-5 mr-2" />
          モデル管理
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>モデル追加</span>
        </button>
      </div>

      {/* モデル一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelSummaries.map((summary) => (
          <div key={summary.modelId} className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-semibold text-gray-900">{summary.modelName}</h4>
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    const model = models.find(m => m.id === summary.modelId);
                    if (model) handleEdit(model);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(summary.modelId)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-600">総売上</p>
                <p className="font-semibold text-green-600">¥{summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">手数料</p>
                <p className="font-semibold text-red-600">¥{summary.totalFees.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">取引数</p>
                <p className="font-semibold text-blue-600">{summary.totalTransactions}件</p>
              </div>
              <div>
                <p className="text-gray-600">プラン/単品</p>
                <p className="font-semibold text-purple-600">{summary.planPurchases}/{summary.singlePurchases}</p>
              </div>
            </div>
            
            {summary.monthlyData.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  最近の活動
                </p>
                <div className="space-y-1">
                  {summary.monthlyData.slice(0, 3).map((monthData, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>{formatYearMonth(monthData.year, monthData.month)}</span>
                      <span className="text-green-600">¥{monthData.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-4">
              最終更新: {new Date(summary.lastActivity).toLocaleDateString('ja-JP')}
            </p>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">モデルが登録されていません</p>
        </div>
      )}

      {/* モデル追加・編集フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingModel ? 'モデル編集' : 'モデル追加'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  モデル名（内部用）
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: model_a"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: モデルA"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="モデルの詳細や特記事項"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {editingModel ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
