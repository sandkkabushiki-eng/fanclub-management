'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  BarChart3,
  Users,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { CSVData, FanClubRevenueData, Model } from '@/types/csv';
import { upsertModelMonthlyData, getModels, getModelMonthlyData } from '@/utils/modelUtils';
import { saveModelToSupabase, saveModelMonthlyDataToSupabase } from '@/utils/supabaseUtils';
import { supabase } from '@/lib/supabase';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelManagement from '@/components/ModelManagement';
import ModelDataManagement from '@/components/ModelDataManagement';
import NotificationSystem, { Notification, generateNotifications } from '@/components/NotificationSystem';
import SecureAuth from '@/components/SecureAuth';
import AdminDashboard from '@/components/AdminDashboard';
import { authManager } from '@/lib/auth';
import { AuthSession } from '@/types/auth';

type TabType = 'upload' | 'models' | 'management';

export default function Home() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [message, setMessage] = useState<string>('');
  const [_models, setModels] = useState<Model[]>([]);
  const [_modelData, setModelData] = useState<Record<string, unknown>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // セッション復元
    const session = authManager.loadSession();
    if (session) {
      setAuthSession(session);
    }
  }, []);

  useEffect(() => {
    // 認証済みの場合のみデータを読み込み
    if (!authSession) return;
    
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
          if (Array.isArray(localMonthlyData) && localMonthlyData.length > 0) {
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
  }, [authSession]);

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

  const handleLogout = () => {
    authManager.logout();
    setAuthSession(null);
    setMessage('ログアウトしました');
  };

  const handleAuthenticated = (session: AuthSession) => {
    setAuthSession(session);
  };

  const handleSyncData = async () => {
    try {
      setMessage('データを同期中...');
      
      // Supabaseから最新データを取得
      const { data: modelsData, error: modelsError } = await supabase.from('models').select('*');
      if (modelsError) {
        console.error('Models fetch error:', modelsError);
        setMessage('⚠️ モデルデータの同期に失敗しました。');
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
        console.log('Models synced:', formattedModels.length);
      }

      const { data: monthlyData, error: monthlyError } = await supabase.from('monthly_data').select('*');
      if (monthlyError) {
        console.error('Monthly data fetch error:', monthlyError);
        setMessage('⚠️ 月別データの同期に失敗しました。');
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
        console.log('Monthly data synced:', monthlyData.length, 'records');
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
  ];

  // 認証されていない場合は認証画面を表示
  if (!authSession) {
    return <SecureAuth onAuthenticated={handleAuthenticated} />;
  }

  // 管理者の場合は管理者ダッシュボードを表示
  if (authSession.user.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-blue-50/95 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* ロゴとタイトル */}
            <div className="flex items-center space-x-4">
              <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-blue-900">
                  ファンクラ君
                </h1>
                <p className="text-sm text-blue-600">
                  売上管理システム
                </p>
              </div>
            </div>
            
            {/* ユーザー情報とアクション */}
            <div className="flex items-center space-x-2">
              {/* ユーザー情報 */}
              <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-blue-50/80 rounded-2xl">
                <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 text-sm font-medium">
                    {authSession.user.name.charAt(0)}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-blue-900">{authSession.user.name}</p>
                  <p className="text-blue-600">{authSession.user.email}</p>
                </div>
              </div>
              
              {/* アクションボタン */}
              <button
                onClick={handleSyncData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-2xl transition-all duration-200"
                title="データ同期"
              >
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline text-sm text-blue-700">同期</span>
              </button>
              
              <NotificationSystem
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onClearAll={handleClearAllNotifications}
              />
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-2xl transition-all duration-200"
                title="ログアウト"
              >
                <LogOut className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline text-sm text-blue-700">ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-8 p-5 rounded-2xl text-center backdrop-blur-sm ${
            message.includes('✅') ? 'bg-blue-50/80 text-blue-800 border border-blue-100' :
            message.includes('⚠️') ? 'bg-yellow-50/80 text-yellow-800 border border-yellow-100' :
            'bg-red-50/80 text-red-800 border border-red-100'
          }`}>
            <p className="font-medium">{message}</p>
          </div>
        )}

        {/* メインコンテンツエリア */}
        <div className="flex gap-8">
          {/* 縦タブナビゲーション */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-blue-50/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-blue-100/50 sticky top-28">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-medium transition-all duration-200 text-sm ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-blue-600 hover:text-blue-900 hover:bg-blue-100/80'
                      }`}
                    >
                      <Icon className={`h-5 w-5 transition-colors duration-200 ${
                        activeTab === tab.id ? 'text-white' : 'text-blue-500'
                      }`} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1">
            <div className="bg-blue-50/40 backdrop-blur-xl rounded-3xl shadow-sm border border-blue-100/50 overflow-hidden">
              <div className="p-10">
                {activeTab === 'upload' && (
                  <CSVUploader onDataLoaded={handleDataLoaded} />
                )}
                
                {activeTab === 'models' && (
                  <ModelManagement />
                )}
                
                {activeTab === 'management' && (
                  <ModelDataManagement />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}