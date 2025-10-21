'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Upload,
  Settings,
  BarChart3,
  DollarSign,
  Calendar,
  Star,
  Eye,
  ChevronRight,
  User,
  Mail,
  Phone,
  Award,
  LogOut,
  Plus,
  Download,
  Filter
} from 'lucide-react';
import { CSVData, FanClubRevenueData, Model } from '@/types/csv';
import { upsertModelMonthlyData, getModels, getModelMonthlyData } from '@/utils/modelUtils';
import { saveModelToSupabase, saveModelMonthlyDataToSupabase } from '@/utils/supabaseUtils';
import { authManager } from '@/lib/auth';
import { AuthSession } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { getCustomerDetailInfo, CustomerDetailInfo, formatCurrency } from '@/utils/csvUtils';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelManagement from '@/components/ModelManagement';
import ModelDataManagement from '@/components/ModelDataManagement';
import CalendarAnalysis from '@/components/CalendarAnalysis';


interface ModelStats {
  totalRevenue: number;
  totalCustomers: number;
  repeatRate: number;
  averageTransactionValue: number;
}

interface IndividualModelStats {
  modelId: string;
  modelName: string;
  revenue: number;
  customers: number;
  transactions: number;
}

const FanClubDashboard: React.FC = () => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'revenue' | 'customers' | 'csv' | 'calendar'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [modelData, setModelData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string>('');
  const [customerViewMode, setCustomerViewMode] = useState<'all' | 'monthly'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedCustomerModelId, setSelectedCustomerModelId] = useState<string>('');

  // ユーザー固有のストレージキーを取得
  const getUserStorageKey = (baseKey: string): string => {
    const userId = authSession?.user?.id || 'default';
    return `${baseKey}-${userId}`;
  };

  // 古いキーから新しいキーにデータを移行
  const migrateOldData = (baseKey: string) => {
    if (!authSession) return;
    
    const oldKey = baseKey;
    const newKey = getUserStorageKey(baseKey);
    
    // 新しいキーにデータがなく、古いキーにデータがある場合のみ移行
    if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        localStorage.setItem(newKey, oldData);
        console.log(`📦 データを移行しました: ${oldKey} → ${newKey}`);
      }
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const session = await authManager.loadSession();
      if (session) {
        setAuthSession(session);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (!authSession) return;
    
    const loadInitialData = async () => {
      try {
        // 古いデータを新しいキーに移行（初回のみ）
        migrateOldData('fanclub-model-data');
        
        const modelsData = getModels();
        setModels(modelsData);
        
        // メインモデルが変更された可能性があるので、常にチェック
        const mainModel = modelsData.find(m => m.isMainModel);
        if (mainModel && (selectedCustomerModelId === '' || selectedCustomerModelId === undefined)) {
          // 初回または未選択の場合、メインモデルを選択
          setSelectedCustomerModelId(mainModel.id);
        }
        
        // ローカルストレージからデータを読み込み（ユーザー固有）
        const userDataKey = getUserStorageKey('fanclub-model-data');
        const localData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
        setModelData(localData);
        console.log('📊 ユーザー固有のデータを読み込みました:', Object.keys(localData).length, '件');
        
        // Supabaseからもデータを読み込んで同期（ユーザー固有のデータのみ）
        try {
          const { data: supabaseData, error } = await supabase
            .from('monthly_data')
            .select('*')
            .eq('user_id', authSession.user.id)
            .order('year', { ascending: false })
            .order('month', { ascending: false });
            
          if (error) {
            console.error('Supabase読み込みエラー:', error);
          } else if (supabaseData && supabaseData.length > 0) {
            console.log('Supabaseからデータを読み込みました:', supabaseData.length, '件');
            // Supabaseのデータをローカルストレージと同期
            const supabaseModelData: Record<string, unknown> = {};
            supabaseData.forEach(row => {
              const key = `${row.model_id}_${row.year}_${row.month}`;
              supabaseModelData[key] = {
                modelId: row.model_id,
                modelName: row.model_name,
                year: row.year,
                month: row.month,
                data: row.data,
                analysis: row.analysis,
                uploadedAt: row.created_at,
                lastModified: row.updated_at
              };
            });
            
            // ローカルデータとSupabaseデータをマージ
            const mergedData = { ...localData, ...supabaseModelData };
            setModelData(mergedData);
            
            // ローカルストレージも更新
            localStorage.setItem('fanclub-model-data', JSON.stringify(mergedData));
          }
        } catch (supabaseError) {
          console.error('Supabase接続エラー:', supabaseError);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [authSession]);

  // メインモデル変更イベントをリッスン
  useEffect(() => {
    const handleMainModelChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { modelId } = customEvent.detail;
      console.log('顧客管理: メインモデル変更イベント受信:', modelId);
      // モデルリストを再読み込み
      const modelsData = getModels();
      setModels(modelsData);
      // 顧客管理のモデル選択をメインモデルに更新
      setSelectedCustomerModelId(modelId);
    };

    window.addEventListener('mainModelChanged', handleMainModelChange);
    
    return () => {
      window.removeEventListener('mainModelChanged', handleMainModelChange);
    };
  }, []);

  const handleDataLoaded = async (data: CSVData[], year: number, month: number, modelId: string) => {
    try {
      setMessage('');
      
      const model = getModels().find(m => m.id === modelId);
      if (model) {
        // ローカルストレージに保存
        upsertModelMonthlyData(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
        
        // Supabaseにも保存
        try {
          await saveModelMonthlyDataToSupabase(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
          console.log('Supabaseへの保存が完了しました');
        } catch (supabaseError) {
          console.error('Supabase保存エラー:', supabaseError);
          // Supabaseの保存に失敗してもローカルストレージには保存されているので続行
        }
      }
      
      setMessage('✨ CSVデータのアップロードが完了しました！');
      setTimeout(() => setMessage(''), 5000);
      
      // データを再読み込み
      setModels(getModels());
      const userDataKey = getUserStorageKey('fanclub-model-data');
      const updatedData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
      setModelData(updatedData);
    } catch (error) {
      console.error('データ保存エラー:', error);
      setMessage('❌ データの保存中にエラーが発生しました。');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleLogout = async () => {
    await authManager.logout();
    setAuthSession(null);
    setModels([]);
    setModelData({});
    setMessage('ログアウトしました');
  };



  const sidebarItems = [
    { icon: LayoutDashboard, label: 'ダッシュボード', active: activeTab === 'overview' },
    { icon: Users, label: 'モデル管理', active: activeTab === 'models' },
    { icon: Upload, label: 'CSVデータ', active: activeTab === 'csv' },
    { icon: Users, label: '顧客管理', active: activeTab === 'customers' },
    { icon: TrendingUp, label: '売上分析', active: activeTab === 'revenue' },
    { icon: Calendar, label: 'カレンダー分析', active: activeTab === 'calendar' },
    { icon: Settings, label: '設定', active: false },
    { icon: LogOut, label: 'ログアウト', active: false, isLogout: true }
  ];

  const getModelStats = (): ModelStats => {
    // データの構造を正しく処理
    const allData = Object.values(modelData).flatMap(item => {
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null && 'data' in item) {
        const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
          ? (item as { data: FanClubRevenueData[] }).data 
          : [];
        
        // 既存データの日付も正規化
        return data.map(record => {
          if (record.日付 && typeof record.日付 === 'string') {
            const dateStr = record.日付;
            const match = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
            if (match) {
              const month = parseInt(match[1]);
              const day = parseInt(match[2]);
              const hour = parseInt(match[3]);
              const minute = parseInt(match[4]);
              const second = parseInt(match[5]);
              
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1;
              
              let year = currentYear;
              if (month > currentMonth) {
                year = currentYear - 1;
              }
              
              const date = new Date(year, month - 1, day, hour, minute, second);
              record.日付 = date.toISOString();
            }
          }
          return record;
        });
      }
      return [];
    }) as FanClubRevenueData[];

    const totalRevenue = allData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
    const totalCustomers = new Set(allData.map(item => item.購入者 || item.顧客名)).size;
    const averageTransactionValue = allData.length > 0 ? totalRevenue / allData.length : 0;
    
    // リピート率の計算
    const customerPurchaseCounts = new Map<string, number>();
    allData.forEach(item => {
      const customer = item.購入者 || item.顧客名 || '不明';
      customerPurchaseCounts.set(customer, (customerPurchaseCounts.get(customer) || 0) + 1);
    });
    const repeatCustomers = Array.from(customerPurchaseCounts.values()).filter(count => count > 1).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    return {
      totalRevenue,
      totalCustomers,
      repeatRate,
      averageTransactionValue
    };
  };

  // 月ごとのデータを取得する関数
  const getMonthlyData = (year: number, month: number): FanClubRevenueData[] => {
    const allData = Object.values(modelData).flatMap(item => {
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null && 'data' in item) {
        const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
          ? (item as { data: FanClubRevenueData[] }).data 
          : [];
        
        // 既存データの日付も正規化
        return data.map(record => {
          if (record.日付 && typeof record.日付 === 'string') {
            const dateStr = record.日付;
            const match = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
            if (match) {
              const recordMonth = parseInt(match[1]);
              const day = parseInt(match[2]);
              const hour = parseInt(match[3]);
              const minute = parseInt(match[4]);
              const second = parseInt(match[5]);
              
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1;
              
              let recordYear = currentYear;
              if (recordMonth > currentMonth) {
                recordYear = currentYear - 1;
              }
              
              const date = new Date(recordYear, recordMonth - 1, day, hour, minute, second);
              record.日付 = date.toISOString();
            }
          }
          return record;
        }).filter(record => {
          if (!record.日付) return false;
          const date = new Date(record.日付);
          return date.getFullYear() === year && date.getMonth() + 1 === month;
        });
      }
      return [];
    }) as FanClubRevenueData[];
    
    return allData;
  };

  const stats = getModelStats();

  // モデル別統計を計算
  const getIndividualModelStats = (): IndividualModelStats[] => {
    const modelMap = new Map<string, IndividualModelStats>();
    
    Object.values(modelData).forEach(item => {
      if (typeof item === 'object' && item !== null && 'data' in item && 'modelId' in item) {
        const monthData = item as { data: FanClubRevenueData[]; modelId: string; modelName: string };
        const data = Array.isArray(monthData.data) ? monthData.data : [];
        
        if (!modelMap.has(monthData.modelId)) {
          const model = models.find(m => m.id === monthData.modelId);
          modelMap.set(monthData.modelId, {
            modelId: monthData.modelId,
            modelName: model?.displayName || monthData.modelName || monthData.modelId,
            revenue: 0,
            customers: 0,
            transactions: 0
          });
        }
        
        const modelStats = modelMap.get(monthData.modelId)!;
        modelStats.revenue += data.reduce((sum, record) => sum + (Number(record.金額) || 0), 0);
        modelStats.customers = new Set([
          ...Array.from({ length: modelStats.customers }),
          ...data.map(record => record.購入者 || record.顧客名)
        ]).size;
        modelStats.transactions += data.length;
      }
    });
    
    return Array.from(modelMap.values()).sort((a, b) => b.revenue - a.revenue);
  };
  
  const individualModelStats = getIndividualModelStats();

  // データ同期機能
  const syncDataWithSupabase = async () => {
    try {
      console.log('Supabaseとのデータ同期を開始...');
      if (!authSession) {
        console.error('ユーザーセッションがありません');
        return;
      }
      const { data: supabaseData, error } = await supabase
        .from('monthly_data')
        .select('*')
        .eq('user_id', authSession.user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
        
      if (error) {
        console.error('Supabase同期エラー:', error);
        return;
      }
      
      if (supabaseData && supabaseData.length > 0) {
        console.log('Supabaseから同期:', supabaseData.length, '件のデータ');
        const supabaseModelData: Record<string, unknown> = {};
        supabaseData.forEach(row => {
          const key = `${row.model_id}_${row.year}_${row.month}`;
          supabaseModelData[key] = {
            modelId: row.model_id,
            modelName: row.model_name,
            year: row.year,
            month: row.month,
            data: row.data,
            analysis: row.analysis,
            uploadedAt: row.created_at,
            lastModified: row.updated_at
          };
        });
        
        const userDataKey = getUserStorageKey('fanclub-model-data');
        const localData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
        const mergedData = { ...localData, ...supabaseModelData };
        setModelData(mergedData);
        localStorage.setItem(userDataKey, JSON.stringify(mergedData));
        
        setMessage('✨ データの同期が完了しました！');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('データ同期エラー:', error);
      setMessage('❌ データの同期中にエラーが発生しました。');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!authSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-blue-900 to-blue-600 transition-all duration-300 flex flex-col`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-white text-xl font-bold">ファンクラ君</h1>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4">
          {sidebarItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if ('isLogout' in item && item.isLogout) {
                  handleLogout();
                } else {
                  setActiveTab(item.label === 'ダッシュボード' ? 'overview' : 
                              item.label === 'モデル管理' ? 'models' :
                              item.label === 'CSVデータ' ? 'csv' :
                              item.label === '売上分析' ? 'revenue' :
                              item.label === '顧客管理' ? 'customers' :
                              item.label === 'カレンダー分析' ? 'calendar' : 'overview');
                }
              }}
              className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>


        {/* User Info */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-blue-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                <span className="text-blue-700 text-sm font-medium">
                  {authSession.user.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-blue-100 text-sm font-medium">{authSession.user.name}</p>
                <p className="text-blue-300 text-xs">{authSession.user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-blue-300 hover:text-white p-1"
                title="ログアウト"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === 'overview' && 'ダッシュボード'}
              {activeTab === 'models' && 'モデル管理'}
              {activeTab === 'csv' && 'CSVデータ'}
              {activeTab === 'revenue' && '売上分析'}
              {activeTab === 'customers' && '顧客管理'}
              {activeTab === 'calendar' && 'カレンダー分析'}
            </h2>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${
            message.includes('✨') ? 'bg-green-100 text-green-800 border border-green-200' :
            message.includes('❌') ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">ダッシュボード</h1>
                <p className="text-gray-600">ファンクラブの売上管理</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">総売上</p>
                      <p className="text-2xl font-bold text-gray-900 truncate" title={`¥${stats.totalRevenue.toLocaleString()}`}>
                        ¥{stats.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">総顧客数</p>
                      <p className="text-2xl font-bold text-gray-900 truncate">
                        {stats.totalCustomers}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-orange-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">平均購入額</p>
                      <p className="text-2xl font-bold text-gray-900 truncate" title={`¥${Math.round(stats.averageTransactionValue).toLocaleString()}`}>
                        ¥{Math.round(stats.averageTransactionValue).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">リピート率</p>
                      <p className="text-2xl font-bold text-gray-900 truncate">
                        {stats.repeatRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab('csv')}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">CSVアップロード</h4>
                      <p className="text-sm text-gray-600">新しいデータを追加</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('models')}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Users className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">モデル管理</h4>
                      <p className="text-sm text-gray-600">モデルを追加・編集</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('revenue')}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">売上分析</h4>
                      <p className="text-sm text-gray-600">詳細な分析を表示</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* モデル別売上ランキング */}
              {individualModelStats.length > 0 && (
                <div className="bg-white border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    モデル別売上ランキング
                  </h3>
                  <div className="space-y-3">
                    {individualModelStats.map((model, index) => (
                      <div key={model.modelId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">{model.modelName}</p>
                            <p className="text-sm text-gray-500">
                              {model.customers}名の顧客 • {model.transactions}件の取引
                            </p>
                          </div>
                        </div>
                        <div className="text-right min-w-0 flex-shrink-0">
                          <p className="text-xl font-bold text-gray-900 truncate" title={formatCurrency(model.revenue)}>
                            {formatCurrency(model.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">モデル管理</h1>
                <p className="text-gray-600">ファンクラブモデルの追加・編集・削除を行います</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <ModelManagement />
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">CSVデータ管理</h1>
                <p className="text-gray-600">売上データをCSVファイルでアップロード・管理します</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">売上分析</h1>
                <p className="text-gray-600">詳細な売上データの分析とレポートを表示します</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <ModelDataManagement />
              </div>
            </div>
          )}


          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="mb-4">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">顧客管理</h1>
                  <p className="text-gray-600">リピーター顧客の詳細分析</p>
                </div>
                
                {/* モデル選択と表示モード切り替え */}
                <div className="flex items-center justify-between mb-4">
                  {/* モデル選択 */}
                  <div className="flex items-center space-x-3">
                    <label htmlFor="customer-model-select" className="text-sm font-medium text-gray-700">
                      モデル選択:
                    </label>
                    <select
                      id="customer-model-select"
                      value={selectedCustomerModelId}
                      onChange={(e) => setSelectedCustomerModelId(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900 min-w-[200px]"
                    >
                      <option value="">全モデル</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 表示モード切り替え */}
                  <div className="flex items-center space-x-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCustomerViewMode('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          customerViewMode === 'all'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        全体データ
                      </button>
                      <button
                        onClick={() => setCustomerViewMode('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          customerViewMode === 'monthly'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        月ごとデータ
                      </button>
                    </div>
                    
                    {/* 年月選択（月ごとデータの場合のみ表示） */}
                    {customerViewMode === 'monthly' && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900"
                        >
                          {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}年</option>
                          ))}
                        </select>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>{month}月</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">総顧客数</p>
                          <p className="text-2xl font-semibold text-gray-900">{stats.totalCustomers}</p>
                        </div>
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">リピーター数</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(() => {
                              const allData = Object.values(modelData).flatMap(item => {
                                if (Array.isArray(item)) return item;
                                if (typeof item === 'object' && item !== null && 'data' in item) {
                                  return Array.isArray((item as { data: FanClubRevenueData[] }).data) 
                                    ? (item as { data: FanClubRevenueData[] }).data 
                                    : [];
                                }
                                return [];
                              }) as FanClubRevenueData[];
                              const repeaters = getCustomerDetailInfo(allData);
                              return repeaters.length;
                            })()}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">平均購入額</p>
                          <p className="text-2xl font-semibold text-gray-900">¥{Math.round(stats.averageTransactionValue).toLocaleString()}</p>
                        </div>
                        <Star className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">リピート率</p>
                          <p className="text-2xl font-semibold text-gray-900">{stats.repeatRate.toFixed(1)}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* リピーター顧客リスト */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">リピーター顧客リスト</h3>
                    <div className="space-y-4">
                      {(() => {
                        // 表示モードに応じてデータを取得
                        const allModelData = customerViewMode === 'all' 
                          ? Object.values(modelData).flatMap(item => {
                              if (Array.isArray(item)) return item;
                              if (typeof item === 'object' && item !== null && 'data' in item) {
                                const itemData = item as { data: FanClubRevenueData[]; modelId?: string };
                                const data = Array.isArray(itemData.data) ? itemData.data : [];
                                
                                // モデルフィルタリング
                                if (selectedCustomerModelId && itemData.modelId !== selectedCustomerModelId) {
                                  return [];
                                }
                                
                                // 既存データの日付も正規化
                                return data.map(record => {
                                  if (record.日付 && typeof record.日付 === 'string') {
                                    const dateStr = record.日付;
                                    const match = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
                                    if (match) {
                                      const month = parseInt(match[1]);
                                      const day = parseInt(match[2]);
                                      const hour = parseInt(match[3]);
                                      const minute = parseInt(match[4]);
                                      const second = parseInt(match[5]);
                                      
                                      const currentDate = new Date();
                                      const currentYear = currentDate.getFullYear();
                                      const currentMonth = currentDate.getMonth() + 1;
                                      
                                      let year = currentYear;
                                      if (month > currentMonth) {
                                        year = currentYear - 1;
                                      }
                                      
                                      const date = new Date(year, month - 1, day, hour, minute, second);
                                      record.日付 = date.toISOString();
                                    }
                                  }
                                  return record;
                                });
                              }
                              return [];
                            }) as FanClubRevenueData[]
                          : getMonthlyData(selectedYear, selectedMonth);
                        
                        // 選択されたモデルでフィルタリング
                        const data = selectedCustomerModelId && customerViewMode === 'monthly'
                          ? allModelData.filter(record => {
                              // monthly_dataのキーからmodelIdを確認
                              const matchingKey = Object.keys(modelData).find(key => 
                                key.startsWith(`${selectedCustomerModelId}_`)
                              );
                              return matchingKey !== undefined;
                            })
                          : allModelData;
                        
                        const repeaters = getCustomerDetailInfo(data);
                        
                        if (repeaters.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p>リピーター顧客のデータがありません</p>
                              <p className="text-sm">CSVデータをアップロードしてください</p>
                            </div>
                          );
                        }
                        
                        return repeaters.map((customer, index) => {
                              // 日付の安全な表示（年月日のみ）
                              const formatDate = (dateString: string) => {
                                if (!dateString) return '不明';
                                const date = new Date(dateString);
                                if (isNaN(date.getTime())) return '不明';
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                const day = date.getDate();
                                return `${year}年${month}月${day}日`;
                              };

                              // メダル表示
                              const getMedal = (index: number) => {
                                if (index === 0) return '🥇';
                                if (index === 1) return '🥈';
                                if (index === 2) return '🥉';
                                return '';
                              };
                          
                          return (
                          <div key={index} className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-6">
                            {/* ヘッダーセクション */}
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                              <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                  {getMedal(index)}{customer.buyerName} さんの利用状況
                                </h1>
                                <p className="text-sm text-gray-600">
                                  利用開始日: {formatDate(customer.firstPurchaseDate)} | 最終購入日: {formatDate(customer.lastPurchaseDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600 mb-1">合計利用金額</p>
                                <span className="text-4xl font-extrabold text-blue-600 block leading-none">
                                  {formatCurrency(customer.totalSpent)}
                                </span>
                              </div>
                            </div>

                            {/* 統計情報グリッド */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              {/* 合計購入回数 */}
                              <div className="bg-blue-50 p-4 rounded-lg text-center hover:transform hover:-translate-y-1 transition-transform">
                                <p className="text-sm font-semibold text-gray-700 mb-1">合計購入回数</p>
                                <span className="text-2xl font-extrabold text-blue-600 block leading-tight">
                                  {customer.totalTransactions} 回
                                </span>
                              </div>

                              {/* 平均単価 */}
                              <div className="bg-orange-50 p-4 rounded-lg text-center hover:transform hover:-translate-y-1 transition-transform">
                                <p className="text-sm font-semibold text-gray-700 mb-1">1回あたりの平均単価</p>
                                <span className="text-2xl font-extrabold text-orange-600 block leading-tight">
                                  {formatCurrency(customer.averageTransactionValue)}
                                </span>
                              </div>
                            </div>

                            {/* 内訳セクション */}
                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dashed border-gray-200">
                              {/* 単品アイテム */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">単品アイテム</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-lg font-bold text-gray-900">{formatCurrency(customer.singleTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.singlePurchaseCount} 個</span>
                                </div>
                              </div>

                              {/* 定期プラン */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">プラン</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-lg font-bold text-gray-900">{formatCurrency(customer.planTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.planPurchaseCount} 回</span>
                                </div>
                              </div>

                              {/* サポート/寄付 */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">チップ・スーパーコメント</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-lg font-bold text-gray-900">{formatCurrency(customer.tipTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.tipCount} 回</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* 月別購入履歴 */}
                            {customer.monthlySpending.length > 0 && (
                              <details className="mt-6">
                                <summary className="cursor-pointer text-center text-sm text-gray-600 hover:text-gray-900 bg-gray-50 py-2 px-4 rounded-lg">
                                  購入履歴を詳しく見る ({customer.monthlySpending.length}ヶ月)
                                </summary>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {customer.monthlySpending.map((month, idx) => {
                                    const displayYear = month.year && !isNaN(month.year) ? month.year : '不明';
                                    const displayMonth = month.month && !isNaN(month.month) ? month.month : '不明';
                                    
                                    return (
                                      <div key={idx} className="bg-gray-50 rounded-lg p-3 text-xs">
                                        <p className="font-semibold text-gray-900 mb-1">{displayYear}年{displayMonth}月</p>
                                        <p className="text-gray-700 font-medium">{formatCurrency(month.amount)}</p>
                                        <p className="text-gray-500">{month.transactions}回</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            )}
                          </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <CalendarAnalysis 
              allData={(() => {
                // 全てのモデルデータを統合
                return Object.values(modelData).flatMap(item => {
                  if (Array.isArray(item)) return item;
                  if (typeof item === 'object' && item !== null && 'data' in item) {
                    const monthData = item as { data: FanClubRevenueData[] };
                    const data = Array.isArray(monthData.data) ? monthData.data : [];
                    
                    // 日付を正規化
                    return data.map(record => {
                      if (record.日付 && typeof record.日付 === 'string') {
                        const dateStr = record.日付;
                        const match = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
                        if (match) {
                          const month = parseInt(match[1]);
                          const day = parseInt(match[2]);
                          const hour = parseInt(match[3]);
                          const minute = parseInt(match[4]);
                          const second = parseInt(match[5]);
                          
                          const currentDate = new Date();
                          const currentYear = currentDate.getFullYear();
                          const currentMonth = currentDate.getMonth() + 1;
                          
                          let year = currentYear;
                          if (month > currentMonth) {
                            year = currentYear - 1;
                          }
                          
                          const date = new Date(year, month - 1, day, hour, minute, second);
                          record.日付 = date.toISOString();
                        }
                      }
                      return record;
                    });
                  }
                  return [];
                }) as FanClubRevenueData[];
              })()}
              modelData={(() => {
                // modelDataをフィルタリング可能な形式に変換
                const formatted: Record<string, { data: FanClubRevenueData[]; modelId: string; modelName: string }> = {};
                Object.entries(modelData).forEach(([key, item]) => {
                  if (typeof item === 'object' && item !== null && 'data' in item && 'modelId' in item) {
                    const monthData = item as { data: FanClubRevenueData[]; modelId: string; modelName: string };
                    const data = Array.isArray(monthData.data) ? monthData.data : [];
                    
                    // 日付を正規化
                    const normalizedData = data.map(record => {
                      if (record.日付 && typeof record.日付 === 'string') {
                        const dateStr = record.日付;
                        const match = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
                        if (match) {
                          const month = parseInt(match[1]);
                          const day = parseInt(match[2]);
                          const hour = parseInt(match[3]);
                          const minute = parseInt(match[4]);
                          const second = parseInt(match[5]);
                          
                          const currentDate = new Date();
                          const currentYear = currentDate.getFullYear();
                          const currentMonth = currentDate.getMonth() + 1;
                          
                          let year = currentYear;
                          if (month > currentMonth) {
                            year = currentYear - 1;
                          }
                          
                          const date = new Date(year, month - 1, day, hour, minute, second);
                          record.日付 = date.toISOString();
                        }
                      }
                      return record;
                    });
                    
                    formatted[key] = {
                      data: normalizedData,
                      modelId: monthData.modelId,
                      modelName: monthData.modelName
                    };
                  }
                });
                return formatted;
              })()}
              models={models}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default FanClubDashboard;
