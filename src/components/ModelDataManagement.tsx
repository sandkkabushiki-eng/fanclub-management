'use client';

import { useState, useEffect } from 'react';
import { Calendar, Edit, Trash2, User, BarChart3, Users, DollarSign } from 'lucide-react';
import { Model, ModelMonthlyData, FanClubRevenueData, RevenueAnalysis } from '@/types/csv';
import { getModels, getModelMonthlyDataByModel, deleteModelMonthlyData, formatYearMonth } from '@/utils/modelUtils';
import { getCurrentUserDataManager } from '@/utils/userDataUtils';
// import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import CSVDataEditor from './CSVDataEditor';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import RevenueDashboard from './RevenueDashboard';
import CustomerAnalysisDashboard from './CustomerAnalysisDashboard';
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
    const loadModels = async () => {
      try {
        console.log('Loading models for data management...');
        
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

  useEffect(() => {
    const loadModelData = async () => {
      if (selectedModelId) {
        try {
          console.log('Loading model data for:', selectedModelId);
          
          // ユーザーデータマネージャーを取得
          const userDataManager = getCurrentUserDataManager();

          if (userDataManager) {
            // ユーザー専用の月次データを取得（全データを取得してからフィルタリング）
            const userMonthlyData = await userDataManager.getUserMonthlyData();
            console.log('Found user monthly data:', userMonthlyData.length, 'records');
            
            // 選択されたモデルのデータのみをフィルタリング
            const filteredData = selectedModelId 
              ? userMonthlyData.filter(item => item.model_id === selectedModelId)
              : userMonthlyData;
              
            console.log('Filtered data for model', selectedModelId, ':', filteredData.length, 'records');
            
            const formattedData: ModelMonthlyData[] = filteredData.map(item => ({
              id: item.id,
              modelId: item.model_id,
              modelName: models.find(m => m.id === item.model_id)?.displayName || '',
              year: item.year,
              month: item.month,
              data: item.data as FanClubRevenueData[],
              analysis: (item as { analysis?: RevenueAnalysis }).analysis || {
                totalRevenue: 0,
                totalFees: 0,
                totalTransactions: 0,
                planPurchases: 0,
                singlePurchases: 0,
                topBuyers: [],
                topProducts: [],
                planDetails: [],
                singleItemDetails: [],
                monthlyPlanDetails: [],
                monthlySingleItemDetails: [],
                monthlyRevenue: [],
                averageTransactionValue: 0,
                averageSpendingPerCustomer: 0,
                feeRate: 0,
                totalCustomers: 0,
                repeatRate: 0
              } as RevenueAnalysis,
              uploadedAt: item.created_at,
              lastModified: item.updated_at,
              createdAt: item.created_at,
              updatedAt: item.updated_at
            }));
            setModelData(formattedData);
          } else {
            // フォールバック: ローカルストレージから取得
            console.log('No user session, using local storage');
            const localModelData = getModelMonthlyDataByModel(selectedModelId);
            console.log('Using local model data:', localModelData.length, 'records');
            setModelData(localModelData);
          }
        } catch (error) {
          console.error('Error loading model data:', error);
          // エラーの場合はローカルストレージから取得
          const localModelData = getModelMonthlyDataByModel(selectedModelId);
          console.log('Fallback to local model data:', localModelData.length, 'records');
          setModelData(localModelData);
        }
      } else {
        setModelData([]);
      }
    };

    loadModelData();
  }, [selectedModelId, models]);

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

  const confirmDelete = async () => {
    if (deletingData) {
      try {
        // ユーザーデータマネージャーを取得
        const userDataManager = getCurrentUserDataManager();
        
        if (userDataManager) {
          // ユーザー専用データから削除
          const success = await userDataManager.deleteUserMonthlyData(
            deletingData.modelId,
            deletingData.year,
            deletingData.month
          );
          
          if (success) {
            console.log('User data deleted successfully');
          } else {
            console.log('Failed to delete user data');
          }
        } else {
          // フォールバック: ローカルストレージから削除
          console.log('No user session, deleting from local storage');
          deleteModelMonthlyData(deletingData.modelId, deletingData.year, deletingData.month);
        }
        
        // データを再読み込み
        if (userDataManager) {
          const userMonthlyData = await userDataManager.getUserMonthlyData();
          const filteredData = selectedModelId 
            ? userMonthlyData.filter(item => item.model_id === selectedModelId)
            : userMonthlyData;
          const formattedData: ModelMonthlyData[] = filteredData.map(item => ({
            id: item.id,
            modelId: item.model_id,
            modelName: models.find(m => m.id === item.model_id)?.displayName || '',
            year: item.year,
            month: item.month,
            data: item.data as FanClubRevenueData[],
              analysis: (item as { analysis?: RevenueAnalysis }).analysis || {
                totalRevenue: 0,
                totalFees: 0,
                totalTransactions: 0,
                planPurchases: 0,
                singlePurchases: 0,
                topBuyers: [],
                topProducts: [],
                planDetails: [],
                singleItemDetails: [],
                monthlyPlanDetails: [],
                monthlySingleItemDetails: [],
                monthlyRevenue: [],
                averageTransactionValue: 0,
                averageSpendingPerCustomer: 0,
                feeRate: 0,
                totalCustomers: 0,
                repeatRate: 0
              } as RevenueAnalysis,
            uploadedAt: item.created_at,
            lastModified: item.updated_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }));
          setModelData(formattedData);
        } else {
          const updatedData = getModelMonthlyDataByModel(selectedModelId);
          setModelData(updatedData);
        }
        
        setDeletingData(null);
      } catch (error) {
        console.error('Error deleting data:', error);
        setDeletingData(null);
      }
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
    { id: 'overall' as const, label: '全体ダッシュボード', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-blue-600">データ管理・分析</h2>
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
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-blue-50 shadow-sm border border-blue-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* モデル選択（全体ダッシュボード以外では表示） */}
      {activeTab !== 'overall' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">モデル選択</h3>
          </div>
          
          {models.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>モデルが登録されていません</p>
              <p className="text-sm">モデル管理タブでモデルを追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map(model => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`relative cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    selectedModelId === model.id
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 transition-all duration-200 ${
                    selectedModelId === model.id
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedModelId === model.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold truncate ${
                          selectedModelId === model.id ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {model.displayName}
                        </h4>
                        <p className={`text-sm truncate ${
                          selectedModelId === model.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {model.name}
                        </p>
                      </div>
                    </div>
                    
                    {selectedModelId === model.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === 'data' && selectedModelId && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            月別データ一覧
          </h3>
          
          {modelData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">データがありません</h3>
              <p className="text-sm">CSVアップロードタブでデータをアップロードしてください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelData.map((data) => (
                <div key={`${data.modelId}-${data.year}-${data.month}`} className="group bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {formatYearMonth(data.year, data.month)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {data.data.length}件のデータ
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(data)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                    >
                      <Edit className="h-4 w-4" />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => handleDelete(data)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
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

      {activeTab === 'revenue' && selectedModelId && <RevenueDashboard selectedModelId={selectedModelId} />}
      {activeTab === 'customers' && selectedModelId && <CustomerAnalysisDashboard selectedModelId={selectedModelId} />}
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