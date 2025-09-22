'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Edit, Trash2, User, BarChart3, Eye } from 'lucide-react';
import { Model, ModelMonthlyData, FanClubRevenueData, RevenueAnalysis } from '@/types/csv';
import { getModels, getModelMonthlyDataByModel, deleteModelMonthlyData, upsertModelMonthlyData, formatYearMonth } from '@/utils/modelUtils';
import { analyzeFanClubRevenue } from '@/utils/csvUtils';
import CSVDataEditor from './CSVDataEditor';
import RevenueDashboard from './RevenueDashboard';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import MonthlyTrendsChart from './MonthlyTrendsChart';
import ModelRepeaterAnalysis from './ModelRepeaterAnalysis';
import OverallDashboard from './OverallDashboard';

interface ModelDataManagementProps {
  onDataChange: () => void;
}

export default function ModelDataManagement({ onDataChange }: ModelDataManagementProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [editingData, setEditingData] = useState<{
    modelId: string;
    modelName: string;
    year: number;
    month: number;
    data: FanClubRevenueData[];
  } | null>(null);
  const [viewingAnalysis, setViewingAnalysis] = useState<{
    modelId: string;
    modelName: string;
    year: number;
    month: number;
    analysis: RevenueAnalysis;
  } | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'overall' | 'trends' | 'repeaters'>('list');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    modelId: string;
    modelName: string;
    year: number;
    month: number;
  }>({
    isOpen: false,
    modelId: '',
    modelName: '',
    year: 0,
    month: 0
  });

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

  const handleDeleteClick = (modelId: string, modelName: string, year: number, month: number) => {
    setDeleteDialog({
      isOpen: true,
      modelId,
      modelName,
      year,
      month
    });
  };

  const handleDeleteConfirm = () => {
    const { modelId, year, month } = deleteDialog;
    const success = deleteModelMonthlyData(modelId, year, month);
    
    if (success) {
      setModelData(getModelMonthlyDataByModel(selectedModelId));
      onDataChange();
      setDeleteDialog({ isOpen: false, modelId: '', modelName: '', year: 0, month: 0 });
    } else {
      alert('データの削除に失敗しました。');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, modelId: '', modelName: '', year: 0, month: 0 });
  };

  const handleEdit = (data: ModelMonthlyData) => {
    const model = models.find(m => m.id === data.modelId);
    if (model) {
      setEditingData({
        modelId: data.modelId,
        modelName: model.displayName,
        year: data.year,
        month: data.month,
        data: data.data
      });
    }
  };

  const handleSaveEdit = (updatedData: FanClubRevenueData[]) => {
    if (editingData) {
      upsertModelMonthlyData(
        editingData.modelId,
        editingData.modelName,
        editingData.year,
        editingData.month,
        updatedData
      );
      setModelData(getModelMonthlyDataByModel(selectedModelId));
      setEditingData(null);
      onDataChange();
    }
  };

  const handleCancelEdit = () => {
    setEditingData(null);
  };

  const handleViewAnalysis = (data: ModelMonthlyData) => {
    const model = models.find(m => m.id === data.modelId);
    if (model) {
      const analysis = analyzeFanClubRevenue(data.data);
      setViewingAnalysis({
        modelId: data.modelId,
        modelName: model.displayName,
        year: data.year,
        month: data.month,
        analysis
      });
    }
  };

  const handleBackToList = () => {
    setViewingAnalysis(null);
    setActiveView('list');
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  // 編集モードの場合は編集画面を表示
  if (editingData) {
    return (
      <CSVDataEditor
        modelId={editingData.modelId}
        modelName={editingData.modelName}
        year={editingData.year}
        month={editingData.month}
        data={editingData.data}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    );
  }

  // 分析表示モードの場合
  if (viewingAnalysis) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                売上分析
              </h2>
              <p className="text-gray-600 mt-1">
                {viewingAnalysis.modelName} - {viewingAnalysis.year}年{viewingAnalysis.month}月
              </p>
            </div>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Calendar className="h-4 w-4 mr-2" />
              データ一覧に戻る
            </button>
          </div>
        </div>
        <RevenueDashboard analysis={viewingAnalysis.analysis} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          データ管理・分析
        </h3>
      </div>

      {/* ビュー切り替えタブ */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveView('list')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            activeView === 'list'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>データ一覧</span>
        </button>
        <button
          onClick={() => setActiveView('overall')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            activeView === 'overall'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>全体ダッシュボード</span>
        </button>
        <button
          onClick={() => setActiveView('trends')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            activeView === 'trends'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>売上推移</span>
        </button>
        <button
          onClick={() => setActiveView('repeaters')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            activeView === 'repeaters'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span>リピーター分析</span>
        </button>
      </div>

      {/* モデル選択（データ一覧とリピーター分析で表示） */}
      {(activeView === 'list' || activeView === 'repeaters') && (
        <div className="bg-white p-4 rounded-lg shadow-md border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            モデルを選択
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">選択してください</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.displayName}</option>
            ))}
          </select>
        </div>
      )}

      {/* ビュー別コンテンツ */}
      {activeView === 'overall' && <OverallDashboard />}
      
      {activeView === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              モデルを選択（空の場合は全体表示）
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">全体表示</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.displayName}</option>
              ))}
            </select>
          </div>
          <MonthlyTrendsChart selectedModelId={selectedModelId} />
        </div>
      )}
      
      {activeView === 'repeaters' && <ModelRepeaterAnalysis selectedModelId={selectedModelId} />}

      {/* 選択されたモデルのデータ一覧 */}
      {activeView === 'list' && selectedModel && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-gray-900">{selectedModel.displayName}</h4>
          </div>

          {modelData.length > 0 ? (
            <div className="space-y-4">
              {modelData.map((data) => (
                <div key={data.id} className="bg-white p-6 rounded-lg shadow-md border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="text-xl font-semibold text-gray-900 mb-2">
                        {formatYearMonth(data.year, data.month)}
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">売上</p>
                          <p className="font-semibold text-green-600">¥{data.analysis.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">手数料</p>
                          <p className="font-semibold text-red-600">¥{data.analysis.totalFees.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">取引数</p>
                          <p className="font-semibold text-blue-600">{data.analysis.totalTransactions}件</p>
                        </div>
                        <div>
                          <p className="text-gray-600">プラン/単品</p>
                          <p className="font-semibold text-purple-600">{data.analysis.planPurchases}/{data.analysis.singlePurchases}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        アップロード日: {new Date(data.uploadedAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleViewAnalysis(data)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        分析
                      </button>
                      <button
                        onClick={() => handleEdit(data)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteClick(data.modelId, selectedModel?.displayName || '', data.year, data.month)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{selectedModel.displayName}のデータがありません</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'list' && !selectedModelId && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">モデルを選択してデータを確認してください</p>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="データを削除"
        message={`${deleteDialog.modelName}の${formatYearMonth(deleteDialog.year, deleteDialog.month)}のデータを完全に削除しますか？この操作は取り消せません。`}
        confirmText="削除する"
        cancelText="キャンセル"
        isDestructive={true}
      />
    </div>
  );
}
