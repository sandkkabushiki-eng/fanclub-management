'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  BarChart3,
  Users,
  Share2,
  Download,
  Database,
  Activity,
  RefreshCw
} from 'lucide-react';
import { CSVData, FanClubRevenueData, Model } from '@/types/csv';
import { upsertModelMonthlyData, getModels, getModelMonthlyData } from '@/utils/modelUtils';
import { saveModelToSupabase, saveModelMonthlyDataToSupabase } from '@/utils/supabaseUtils';
import { supabase } from '@/lib/supabase';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelManagement from '@/components/ModelManagement';
import ModelDataManagement from '@/components/ModelDataManagement';
import DataSharing from '@/components/DataSharing';
import AdvancedExport from '@/components/AdvancedExport';
import BackupSystem from '@/components/BackupSystem';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import NotificationSystem, { Notification, generateNotifications } from '@/components/NotificationSystem';

type TabType = 'upload' | 'models' | 'management' | 'sharing' | 'export' | 'backup' | 'monitor';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [message, setMessage] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [modelData, setModelData] = useState<Record<string, unknown>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // 初期データの読み込み（Supabaseから）
    const loadInitialData = async () => {
      try {
        console.log('Starting initial data load...');
        
        // Supabaseからモデルデータを取得
        const { data: modelsData, error: modelsError } = await supabase.from('models').select('*');
        if (modelsError) {
          console.error('Models fetch error:', modelsError);
          setMessage(`モデルデータの取得に失敗しました: ${modelsError.message}`);
        } else if (modelsData && modelsData.length > 0) {
          console.log('Found models data:', modelsData.length, 'models');
          // Supabaseのデータをローカルストレージに保存
          const formattedModels = modelsData.map(m => ({
            id: m.id,
            name: m.name,
            displayName: m.display_name,
            status: 'active' as const,
            createdAt: m.created_at,
            updatedAt: m.updated_at
          }));
          localStorage.setItem('fanclub-models', JSON.stringify(formattedModels));
          setModels(formattedModels);
        } else {
          console.log('No models data found, loading from local storage');
          // Supabaseにデータがない場合はローカルストレージから読み込み
          setModels(getModels());
        }

        // Supabaseから月別データを取得
        const { data: monthlyData, error: monthlyError } = await supabase.from('monthly_data').select('*');
        if (monthlyError) {
          console.error('Monthly data fetch error:', monthlyError);
          setMessage(`月別データの取得に失敗しました: ${monthlyError.message}`);
        } else if (monthlyData && monthlyData.length > 0) {
          console.log('Found monthly data:', monthlyData.length, 'records');
          // Supabaseのデータをローカルストレージ形式に変換
          const formattedData: Record<string, Record<number, Record<number, FanClubRevenueData[]>>> = {};
          
          monthlyData.forEach((row: { model_id: string; year: number; month: number; data: FanClubRevenueData[] }) => {
            if (!formattedData[row.model_id]) {
              formattedData[row.model_id] = {};
            }
            if (!formattedData[row.model_id][row.year]) {
              formattedData[row.model_id][row.year] = {};
            }
            formattedData[row.model_id][row.year][row.month] = row.data;
          });
          
          localStorage.setItem('fanclub-model-data', JSON.stringify(formattedData));
          setModelData(formattedData);
        } else {
          console.log('No monthly data found, loading from local storage');
          // Supabaseにデータがない場合はローカルストレージから読み込み
          const data = JSON.parse(localStorage.getItem('fanclub-model-data') || '{}') as Record<string, unknown>;
          setModelData(data);
        }
        
        // 通知の生成
        try {
          const localMonthlyData = getModelMonthlyData();
          if (localMonthlyData.length > 0) {
            const latestData = localMonthlyData[0];
            const newNotifications = generateNotifications({
              totalRevenue: latestData.analysis?.totalRevenue || 0,
              newCustomers: latestData.analysis?.totalCustomers || 0,
              repeatRate: latestData.analysis?.repeatRate || 0,
              averageTransactionValue: latestData.analysis?.averageTransactionValue || 0
            });
            setNotifications(newNotifications);
          }
        } catch (notificationError) {
          console.error('Error generating notifications:', notificationError);
        }
        
        console.log('Initial data load completed successfully');
      } catch (error) {
        console.error('Error loading initial data:', error);
        setMessage(`データの読み込み中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // エラーの場合はローカルストレージから読み込み
        try {
          setModels(getModels());
          const data = JSON.parse(localStorage.getItem('fanclub-model-data') || '{}') as Record<string, unknown>;
          setModelData(data);
        } catch (fallbackError) {
          console.error('Fallback data load also failed:', fallbackError);
          setMessage('データの読み込みに完全に失敗しました。ページを再読み込みしてください。');
        }
      }
    };

    loadInitialData();
  }, []);

  const handleDataLoaded = async (data: CSVData[], year: number, month: number, modelId: string) => {
    try {
      setMessage('');
      
      // ローカルストレージにデータを保存
      const model = getModels().find(m => m.id === modelId);
      if (model) {
        upsertModelMonthlyData(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
      }
      
      // クラウドに自動同期
      try {
        // モデル情報をクラウドに保存
        if (model) {
          await saveModelToSupabase(model);
        }
        
        // 月別データをクラウドに保存
        const success = await saveModelMonthlyDataToSupabase(modelId, year, month, data as FanClubRevenueData[]);
        
        if (success) {
          setMessage('✅ データが正常にアップロードされ、全員に自動共有されました！');
          
          // データ更新
          setModels(getModels());
          const updatedData = JSON.parse(localStorage.getItem('fanclub-model-data') || '{}') as Record<string, unknown>;
          setModelData(updatedData);
          
          // 新しい通知を生成
          const newNotifications = generateNotifications({
            totalRevenue: data.reduce((sum, item) => sum + (Number(item.金額) || 0), 0),
            newCustomers: new Set(data.map(item => item.購入者 || item.顧客名)).size,
            repeatRate: 0, // 計算が必要
            averageTransactionValue: data.reduce((sum, item) => sum + (Number(item.金額) || 0), 0) / data.length
          });
          setNotifications(prev => [...newNotifications, ...prev]);
        } else {
          setMessage('⚠️ データは保存されましたが、クラウド同期に失敗しました。');
        }
      } catch (syncError) {
        console.error('クラウド同期エラー:', syncError);
        setMessage('⚠️ データは保存されましたが、クラウド同期に失敗しました。');
      }
      
      // 5秒後にメッセージをクリア
      setTimeout(() => setMessage(''), 5000);
      
      setActiveTab('models');
    } catch (error) {
      console.error('データ保存エラー:', error);
      setMessage('❌ データの保存中にエラーが発生しました。');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleSyncData = async () => {
    try {
      setMessage('データを同期中...');
      
      // Supabaseから最新データを取得
      const { data: modelsData, error: modelsError } = await supabase.from('models').select('*');
      if (modelsError) {
        console.error('Models fetch error:', modelsError);
      } else if (modelsData && modelsData.length > 0) {
        const formattedModels = modelsData.map(m => ({
          id: m.id,
          name: m.name,
          displayName: m.display_name,
          status: 'active' as const,
          createdAt: m.created_at,
          updatedAt: m.updated_at
        }));
        localStorage.setItem('fanclub-models', JSON.stringify(formattedModels));
        setModels(formattedModels);
      }

      const { data: monthlyData, error: monthlyError } = await supabase.from('monthly_data').select('*');
      if (monthlyError) {
        console.error('Monthly data fetch error:', monthlyError);
      } else if (monthlyData && monthlyData.length > 0) {
        const formattedData: Record<string, Record<number, Record<number, FanClubRevenueData[]>>> = {};
        
        monthlyData.forEach((row: { model_id: string; year: number; month: number; data: FanClubRevenueData[] }) => {
          if (!formattedData[row.model_id]) {
            formattedData[row.model_id] = {};
          }
          if (!formattedData[row.model_id][row.year]) {
            formattedData[row.model_id][row.year] = {};
          }
          formattedData[row.model_id][row.year][row.month] = row.data;
        });
        
        localStorage.setItem('fanclub-model-data', JSON.stringify(formattedData));
        setModelData(formattedData);
      }

      setMessage('✅ データの同期が完了しました！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setMessage('❌ データの同期中にエラーが発生しました。');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const tabs = [
    { id: 'upload' as TabType, label: 'CSVアップロード', icon: Upload },
    { id: 'models' as TabType, label: 'モデル管理', icon: Users },
    { id: 'management' as TabType, label: 'データ管理', icon: BarChart3 },
    { id: 'sharing' as TabType, label: 'データ共有', icon: Share2 },
    { id: 'export' as TabType, label: '高度なエクスポート', icon: Download },
    { id: 'backup' as TabType, label: 'バックアップ', icon: Database },
    { id: 'monitor' as TabType, label: 'パフォーマンス', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-red-600 mb-2">
              ファンクラ君
            </h1>
            <p className="text-gray-600">
              売上管理システム
            </p>
          </div>
          
          {/* データ同期ボタンと通知システム */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSyncData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Supabaseから最新データを同期"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">データ同期</span>
            </button>
            
            <NotificationSystem
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onClearAll={handleClearAllNotifications}
            />
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
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

        {/* タブコンテンツ */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
          {activeTab === 'upload' && (
            <CSVUploader onDataLoaded={handleDataLoaded} />
          )}
          
          {activeTab === 'models' && (
            <ModelManagement />
          )}
          
          {activeTab === 'management' && (
            <ModelDataManagement />
          )}
          
          {activeTab === 'sharing' && (
            <DataSharing />
          )}

          {activeTab === 'export' && (
            <AdvancedExport models={models} modelData={modelData} />
          )}

          {activeTab === 'backup' && (
            <BackupSystem models={models} modelData={modelData} />
          )}

          {activeTab === 'monitor' && (
            <PerformanceMonitor />
          )}
        </div>
      </div>
    </div>
  );
}