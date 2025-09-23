'use client';

import { useState, useEffect } from 'react';
import { Calendar, Edit, Trash2, User, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Model, ModelMonthlyData, FanClubRevenueData } from '@/types/csv';
import { getModels, getModelMonthlyDataByModel, deleteModelMonthlyData, formatYearMonth } from '@/utils/modelUtils';
// import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import CSVDataEditor from './CSVDataEditor';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import RevenueDashboard from './RevenueDashboard';
import CustomerAnalysisDashboard from './CustomerAnalysisDashboard';
import MonthlyTrendsChart from './MonthlyTrendsChart';
import OverallDashboard from './OverallDashboard';

export default function ModelDataManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'revenue' | 'customers' | 'trends' | 'overall'>('data');
  const [editingData, setEditingData] = useState<{
    modelId: string;
    modelName: string;
    year: number;
    month: number;
    data: FanClubRevenueData[];
  } | null>(null);
  const [deletingData, setDeletingData] = useState<{
    modelId: string;
    year: number;
    month: number;
  } | null>(null);

  useEffect(() => {
    setModels(getModels());
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      setModelData(getModelMonthlyDataByModel(selectedModelId));
    } else {
      setModelData([]);
    }
  }, [selectedModelId]);

  const handleEdit = (data: ModelMonthlyData) => {
    setEditingData({
      modelId: data.modelId,
      modelName: data.modelName,
      year: data.year,
      month: data.month,
      data: data.data
    });
  };

  const handleDelete = (data: ModelMonthlyData) => {
    setDeletingData({
      modelId: data.modelId,
      year: data.year,
      month: data.month
    });
  };

  const confirmDelete = () => {
    if (deletingData) {
      deleteModelMonthlyData(deletingData.modelId, deletingData.year, deletingData.month);
      setModelData(getModelMonthlyDataByModel(selectedModelId));
      setDeletingData(null);
    }
  };

  const handleEditComplete = () => {
    setEditingData(null);
    setModelData(getModelMonthlyDataByModel(selectedModelId));
  };

  const tabs = [
    { id: 'data' as const, label: 'データ管理', icon: Calendar },
    { id: 'revenue' as const, label: '売上分析', icon: DollarSign },
    { id: 'customers' as const, label: '顧客分析', icon: Users },
    { id: 'trends' as const, label: '月別トレンド', icon: TrendingUp },
    { id: 'overall' as const, label: '全体ダッシュボード', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">データ管理・分析</h2>
      </div>

      {/* タブナビゲーション */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-red-50 shadow-sm border border-red-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* モデル選択（データ管理タブ以外では表示） */}
      {activeTab !== 'overall' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            モデル選択
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">モデルを選択してください</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === 'data' && selectedModelId && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            月別データ一覧
          </h3>
          
          {modelData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              データがありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelData.map((data) => (
                <div key={`${data.modelId}-${data.year}-${data.month}`} className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <Calendar className="h-6 w-6 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {formatYearMonth(data.year, data.month)}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {data.data.length}件のデータ
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(data)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => handleDelete(data)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && <RevenueDashboard />}
      {activeTab === 'customers' && <CustomerAnalysisDashboard />}
      {activeTab === 'trends' && <MonthlyTrendsChart />}
      {activeTab === 'overall' && <OverallDashboard />}

      {/* 編集ダイアログ */}
      {editingData && (
        <CSVDataEditor
          modelId={editingData.modelId}
          modelName={editingData.modelName}
          year={editingData.year}
          month={editingData.month}
          data={editingData.data}
          onSave={handleEditComplete}
          onCancel={() => setEditingData(null)}
        />
      )}

      {/* 削除確認ダイアログ */}
      {deletingData && (
        <DeleteConfirmDialog
          isOpen={!!deletingData}
          title="データ削除"
          message={`${formatYearMonth(deletingData.year, deletingData.month)}のデータを削除しますか？`}
          onConfirm={confirmDelete}
          onClose={() => setDeletingData(null)}
        />
      )}
    </div>
  );
}