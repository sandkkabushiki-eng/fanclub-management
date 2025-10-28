'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Upload,
  BarChart3,
  DollarSign,
  Calendar,
  Star,
  ChevronRight,
  Menu,
  X,
  Heart,
  Shield
} from 'lucide-react';
import { CSVData, FanClubRevenueData } from '@/types/csv';
import { upsertModelMonthlyData, getModels } from '@/utils/modelUtils';
import { getCurrentUserDataManager } from '@/utils/userDataUtils';
import { saveModelMonthlyDataToSupabase } from '@/utils/supabaseUtils';
import { debugSupabaseConnection } from '@/utils/debugSupabase';
import { calculateModelStats } from '@/utils/statsUtils';
import { clearLocalData, getPreservedKeys } from '@/utils/dataClearUtils';
import { syncLocalModelsToSupabase } from '@/utils/modelSyncUtils';
import { authManager } from '@/lib/auth';
import { AuthSession } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { logSecurityStatus, showSecurityWarnings } from '@/utils/securityValidator';
import { getCustomerDetailInfo, formatCurrency } from '@/utils/csvUtils';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelDataManagement from '@/components/ModelDataManagement';
import ModelManagement from '@/components/ModelManagement';
import CalendarAnalysis from '@/components/CalendarAnalysis';
import RevenueDashboard from '@/components/RevenueDashboard';
import { useGlobalModelSelection, useGlobalModelSelectionListener } from '@/hooks/useGlobalModelSelection';


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

interface FanClubDashboardProps {
  authSession: any;
  onLogout: () => Promise<void>;
}

const FanClubDashboard: React.FC<FanClubDashboardProps> = ({ authSession: propAuthSession, onLogout }) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(propAuthSession);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'revenue' | 'customers' | 'csv' | 'calendar' | 'settings'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelData, setModelData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string>('');
  const [customerViewMode, setCustomerViewMode] = useState<'all' | 'monthly'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // グローバルなモデル選択状態を使用
  const { selectedModelId, setSelectedModelId, models, setModels, mainModel } = useGlobalModelSelection();
  
  // グローバル状態の初期化を確認
  useEffect(() => {
    if (selectedModelId && models.length > 0) {
      console.log('🌟 ファン管理: グローバル状態から初期化:', selectedModelId);
    }
  }, [selectedModelId, models]);

  // グローバルなモデル選択変更をリッスン
  const handleGlobalModelSelectionChange = useCallback((globalSelectedModelId: string) => {
    console.log('🌟 ファン管理: グローバルモデル選択変更:', globalSelectedModelId);
    setSelectedModelId(globalSelectedModelId);
  }, []);

  useGlobalModelSelectionListener(handleGlobalModelSelectionChange);

  // ユーザー固有のストレージキーを取得（modelUtils.tsと同じ方法）
  const getUserStorageKey = (baseKey: string): string => {
    const currentUser = authManager.getCurrentUser();
    const userId = currentUser?.id || 'default';
    return `${baseKey}-${userId}`;
  };

  // デバッグ用: ストレージの内容を確認
  const debugStorageContents = () => {
    console.log('🔍 ストレージデバッグ開始');
    console.log('🔍 authSession.user.id:', authSession?.user?.id);
    console.log('🔍 authManager.getCurrentUser():', authManager.getCurrentUser());
    
    // 全てのlocalStorageキーを確認
    const allKeys = Object.keys(localStorage);
    console.log('🔍 全てのlocalStorageキー:', allKeys);
    
    // fanclub関連のキーを特定
    const fanclubKeys = allKeys.filter(key => key.includes('fanclub'));
    console.log('🔍 fanclub関連キー:', fanclubKeys);
    
    // 各キーの内容を確認
    fanclubKeys.forEach(key => {
      const data = localStorage.getItem(key);
      try {
        const parsed = data ? JSON.parse(data) : null;
        console.log(`🔍 ${key}:`, parsed);
      } catch (e) {
        console.log(`🔍 ${key}: パースエラー`, data);
      }
    });
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
        
        // セキュリティ状態を検証
        logSecurityStatus();
        showSecurityWarnings();
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 認証セッションがない場合はスキップ
        if (!authSession?.user?.id) {
          console.log('📊 認証セッションがないため、データ読み込みをスキップ');
          return;
        }
        
        // デバッグ: ストレージの内容を確認
        debugStorageContents();
        
        // 古いデータを新しいキーに移行（初回のみ）
        migrateOldData('fanclub-model-data');
        
        // ユーザーデータマネージャーを使ってモデルを取得（売上分析と同じ方法）
        const userDataManager = getCurrentUserDataManager();
        console.log('📋 ユーザーデータマネージャー:', userDataManager ? 'Found' : 'Not found');
        
        if (userDataManager) {
          const userModels = await userDataManager.getUserModels();
          console.log('📋 ユーザーモデル:', userModels.length, '件');
          setModels(userModels);
        } else {
          // フォールバック: ローカルストレージから取得
          const modelsData = getModels();
          console.log('📋 ローカルモデル:', modelsData.length, '件');
          setModels(modelsData);
        }
        
        // メインモデルが変更された可能性があるので、常にチェック
        const currentModels = userDataManager ? await userDataManager.getUserModels() : getModels();
        const mainModel = currentModels.find(m => m.isMainModel);
        
        // グローバル状態のモデルリストを更新（自動的に選択も更新される）
        setModels(currentModels);
        
        // ローカルストレージからデータを読み込み（ユーザー固有）
        const userDataKey = getUserStorageKey('fanclub-model-data');
        const localData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
        setModelData(localData);
        console.log('📊 ユーザー固有のデータを読み込みました:', Object.keys(localData).length, '件');
        console.log('📊 データの詳細:', Object.keys(localData));
        
        // Supabaseからもデータを読み込んで同期（ユーザー固有のデータのみ）
        if (authSession?.user?.id) {
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
        } else {
          console.log('📊 認証セッションがないため、Supabase読み込みをスキップ');
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [authSession]); // authSessionの依存を追加

  // メインモデル変更イベントをリッスン
  useEffect(() => {
    const handleMainModelChange = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { modelId } = customEvent.detail;
      console.log('🌟 ファン管理: メインモデル変更イベント受信:', modelId);
      
      // ユーザーデータマネージャーを使って最新のモデルデータを取得
      const userDataManager = getCurrentUserDataManager();
      if (userDataManager) {
        const userModels = await userDataManager.getUserModels();
        console.log('🌟 ファン管理: 最新モデルデータ:', userModels.length, '件');
        setModels(userModels);
      } else {
        // フォールバック
        const modelsData = getModels();
        setModels(modelsData);
      }
      
      // メインモデルが解除された場合（modelIdがnull）
      if (modelId === null) {
        console.log('🌟 ファン管理: メインモデル解除、最初のモデルを選択');
        const userDataManager = getCurrentUserDataManager();
        const currentModels = userDataManager ? await userDataManager.getUserModels() : getModels();
        if (currentModels.length > 0) {
          setSelectedModelId(currentModels[0].id);
        }
      } else {
        // ファン管理のモデル選択をメインモデルに更新
        setSelectedModelId(modelId);
      }
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
        
        // Supabaseにも保存（モデルを先に保存してから月別データを保存）
        try {
          // 1. まずモデルをSupabaseに保存
          const { saveModelToSupabase } = await import('@/utils/supabaseUtils');
          const modelSaved = await saveModelToSupabase(model);
          
          if (modelSaved) {
            console.log('✅ モデルをSupabaseに保存しました');
            
            // 2. モデルが保存されたら月別データを保存
            await saveModelMonthlyDataToSupabase(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
            console.log('✅ Supabaseへの保存が完了しました');
          } else {
            console.warn('⚠️ モデルの保存に失敗しました。ローカルストレージのみに保存します。');
          }
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
    await onLogout(); // 親コンポーネントのonLogoutを呼び出し
  };

  // 月別データの削除処理（正確なモデル分離）
  const handleDeleteMonthData = async (modelId: string, month: string, monthData: FanClubRevenueData[]) => {
    try {
      console.log('🗑️ 月別データ削除開始:', modelId, month, monthData.length, '件');
      console.log('🗑️ 削除対象モデルID:', modelId);
      console.log('🗑️ 削除対象月:', month);
      
      // 現在のmodelDataから該当の月のデータを除外
      const updatedModelData = { ...modelData };
      
      // 該当モデルのキーを正確に特定
      const modelKey = Object.keys(updatedModelData).find(key => key.startsWith(`${modelId}_`));
      
      if (!modelKey) {
        console.error('❌ モデルキーが見つかりません:', modelId);
        setMessage('❌ モデルデータが見つかりません');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      console.log('🗑️ 見つかったモデルキー:', modelKey);
      
      if (updatedModelData[modelKey]) {
        const modelDataItem = updatedModelData[modelKey] as { data: FanClubRevenueData[] };
        const allData = modelDataItem.data || [];
        
        console.log('🗑️ 削除前のデータ数:', allData.length, '件');
        
        // 該当月のデータを除外（日付の正規化も考慮）
        const filteredData = allData.filter(item => {
          if (!item.日付) return true;
          
          let date: Date;
          if (typeof item.日付 === 'string' && item.日付.includes('月') && item.日付.includes('日')) {
            // 日付の正規化処理
            const match = item.日付.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
            if (match) {
              const monthNum = parseInt(match[1]);
              const day = parseInt(match[2]);
              const hour = parseInt(match[3]);
              const minute = parseInt(match[4]);
              const second = parseInt(match[5]);
              
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1;
              
              let year = currentYear;
              if (monthNum > currentMonth) {
                year = currentYear - 1;
              }
              
              date = new Date(year, monthNum - 1, day, hour, minute, second);
            } else {
              date = new Date(item.日付);
            }
          } else {
            date = new Date(item.日付);
          }
          
          const itemMonth = `${date.getFullYear()}年${date.getMonth() + 1}月`;
          return itemMonth !== month;
        });
        
        console.log('🗑️ 削除後のデータ数:', filteredData.length, '件');
        
        // データを更新
        updatedModelData[modelKey] = { data: filteredData };
        setModelData(updatedModelData);
        
        // ローカルストレージに保存
        const userDataKey = getUserStorageKey('fanclub-model-data');
        localStorage.setItem(userDataKey, JSON.stringify(updatedModelData));
        
        // Supabaseにも保存（monthly_dataテーブルを使用）
        if (authSession?.user?.id && modelId) {
          try {
            // 月文字列から年月を解析
            const monthMatch = month.match(/(\d+)年(\d+)月/);
            if (monthMatch) {
              const year = parseInt(monthMatch[1]);
              const monthNum = parseInt(monthMatch[2]);
              
              // データが空の場合は削除、そうでなければ更新
              if (filteredData.length === 0) {
                // Supabaseから該当レコードを削除
                const { error: deleteError } = await supabase
                  .from('monthly_data')
                  .delete()
                  .eq('model_id', modelId)
                  .eq('user_id', authSession.user.id)
                  .eq('year', year)
                  .eq('month', monthNum);
                
                if (deleteError) {
                  console.error('Supabase削除エラー:', deleteError);
                } else {
                  console.log('✅ Supabaseから削除完了');
                }
              } else {
                // Supabaseに更新
                const { error } = await supabase
                  .from('monthly_data')
                  .upsert({
                    model_id: modelId,
                    user_id: authSession.user.id,
                    year: year,
                    month: monthNum,
                    data: filteredData,
                    analysis: null, // 分析データは後で計算
                    updated_at: new Date().toISOString()
                  });
                
                if (error) {
                  console.error('Supabase保存エラー:', error);
                } else {
                  console.log('✅ Supabaseに保存完了');
                }
              }
            }
          } catch (supabaseError) {
            console.error('Supabase保存エラー:', supabaseError);
          }
        }
        
        setMessage(`✅ ${month}のデータ（${monthData.length}件）を削除しました`);
        setTimeout(() => setMessage(''), 3000);
        
        console.log('✅ 月別データ削除完了');
      } else {
        console.error('❌ モデルデータが見つかりません:', modelKey);
        setMessage('❌ データの削除に失敗しました');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ 月別データ削除エラー:', error);
      setMessage('❌ データの削除に失敗しました');
      setTimeout(() => setMessage(''), 3000);
    }
  };



  const sidebarItems = [
    { icon: LayoutDashboard, label: 'ダッシュボード', active: activeTab === 'overview' },
    { icon: Users, label: 'モデル管理', active: activeTab === 'models' },
    { icon: Upload, label: 'CSVデータ', active: activeTab === 'csv' },
    { icon: Users, label: 'ファン管理', active: activeTab === 'customers' },
    { icon: TrendingUp, label: '売上分析', active: activeTab === 'revenue' },
    { icon: Calendar, label: 'カレンダー分析', active: activeTab === 'calendar' }
  ];

  const getModelStats = (): ModelStats => {
    console.log('📊 ファン管理統計計算開始');
    console.log('📊 選択されたモデルID:', selectedModelId);
    console.log('📊 modelData keys:', Object.keys(modelData));
    console.log('📊 modelData values:', Object.values(modelData).length);
    
    // データの構造を正しく処理し、選択されたモデルのデータのみをフィルタリング
    const allData = Object.values(modelData).flatMap(item => {
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null && 'data' in item) {
        const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
          ? (item as { data: FanClubRevenueData[] }).data 
          : [];
        
        // 選択されたモデルのデータのみをフィルタリング
        if (selectedModelId && selectedModelId !== 'all') {
          // モデルIDでフィルタリング（modelDataのキーからmodelIdを取得）
          const modelKey = Object.keys(modelData).find(key => key.startsWith(`${selectedModelId}_`));
          if (!modelKey) {
            return []; // 選択されたモデルのデータが見つからない場合
          }
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
    }) as FanClubRevenueData[];

    // 選択されたモデルのデータのみをフィルタリング
    const filteredData = selectedModelId && selectedModelId !== 'all'
      ? allData.filter(record => {
          // modelDataのキーからmodelIdを確認
          const matchingKey = Object.keys(modelData).find(key => 
            key.startsWith(`${selectedModelId}_`)
          );
          return matchingKey !== undefined;
        })
      : allData;

    console.log('📊 フィルタリング後のデータ数:', filteredData.length);

    const totalRevenue = filteredData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
    const totalCustomers = new Set(filteredData.map(item => item.購入者 || item.顧客名)).size;
    const averageTransactionValue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0;
    
    // リピート率の計算
    const customerPurchaseCounts = new Map<string, number>();
    filteredData.forEach(item => {
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

  const stats = calculateModelStats(modelData, selectedModelId);
  console.log('📊 計算された統計:', stats);
  console.log('📊 modelData詳細:', JSON.stringify(modelData, null, 2));
  console.log('📊 selectedModelId:', selectedModelId);

  // モデル別統計を計算
  const getIndividualModelStats = (): IndividualModelStats[] => {
    const modelMap = new Map<string, IndividualModelStats>();
    
    Object.values(modelData).forEach(item => {
      if (typeof item === 'object' && item !== null && 'data' in item && 'modelId' in item) {
        const monthData = item as { data: FanClubRevenueData[]; modelId: string; modelName: string };
        const data = Array.isArray(monthData.data) ? monthData.data : [];
        
        if (!modelMap.has(monthData.modelId)) {
          const model = models.find(m => m.id === monthData.modelId);
          const modelName = model?.displayName || monthData.modelName || `モデル${monthData.modelId}`;
          console.log('モデル名取得:', {
            modelId: monthData.modelId,
            modelDisplayName: model?.displayName,
            monthDataModelName: monthData.modelName,
            finalName: modelName
          });
          modelMap.set(monthData.modelId, {
            modelId: monthData.modelId,
            modelName: modelName,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <div className={`
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        bg-pink-400 transition-all duration-300 flex flex-col
        fixed lg:relative inset-y-0 left-0 z-50
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="ファンリピ" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    console.log('ロゴ読み込みエラー:', e);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => console.log('ロゴ読み込み成功')}
                />
                <div className="flex flex-col">
                  <span className="text-lg font-bold bg-gradient-to-r from-pink-200 to-yellow-200 bg-clip-text text-transparent leading-tight">
                    ファンリピ
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {/* Mobile close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white hover:bg-pink-700 p-2 rounded-lg transition-colors lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              {/* Desktop collapse button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-white hover:bg-pink-700 p-2 rounded-lg transition-colors hidden lg:block"
              >
                <ChevronRight className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4">
          {sidebarItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveTab(item.label === 'ダッシュボード' ? 'overview' : 
                            item.label === 'モデル管理' ? 'models' :
                            item.label === 'CSVデータ' ? 'csv' :
                            item.label === '売上分析' ? 'revenue' :
                            item.label === 'ファン管理' ? 'customers' :
                            item.label === 'カレンダー分析' ? 'calendar' : 'overview');
                // モバイルメニューを閉じる
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-pink-700 text-white'
                  : 'text-pink-100 hover:bg-pink-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {!sidebarCollapsed && <span className="font-bold text-base">{item.label}</span>}
            </button>
          ))}
        </nav>


        {/* User Info - Simplified */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-gray-600">
            {/* ユーザー名のみ表示 */}
            <div className="mb-3">
              <p className="text-gray-200 text-sm font-medium truncate" title={authSession.user.name}>
                {authSession.user.name}
              </p>
            </div>
            
            {/* シンプルなボタン */}
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1.5 rounded text-xs transition-colors"
                title="設定"
              >
                設定
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1.5 rounded text-xs transition-colors"
                title="ログアウト"
              >
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden lg:ml-0"
        onClick={() => {
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
        }}
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
              {activeTab === 'overview' && 'ダッシュボード'}
              {activeTab === 'models' && 'モデル管理'}
              {activeTab === 'csv' && 'CSVデータ'}
              {activeTab === 'revenue' && '売上分析'}
              {activeTab === 'customers' && 'ファン管理'}
              {activeTab === 'calendar' && 'カレンダー分析'}
              {activeTab === 'settings' && '設定'}
            </h2>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${
            message.includes('✨') ? 'bg-green-100 text-green-800 border border-green-200' :
            message.includes('❌') ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-pink-100 text-pink-800 border border-pink-200'
          }`}>
            {message}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-pink-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">総売上</p>
                      <p className="text-2xl font-bold text-gray-900 truncate" title={`¥${stats.totalRevenue.toLocaleString()}`}>
                        ¥{stats.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">データ: {Object.keys(modelData).length}件</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-pink-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-pink-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-500">総顧客数</p>
                      <p className="text-2xl font-bold text-gray-900 truncate">
                        {stats.totalCustomers}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-pink-200 rounded-lg p-4">
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
                
                <div className="bg-white border border-pink-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-pink-600 flex-shrink-0" />
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
                <div className="bg-white border border-pink-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    モデル別売上ランキング
                  </h3>
                  <div className="space-y-3">
                    {individualModelStats.map((model, index) => (
                      <div key={model.modelId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
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
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">モデル管理</h3>
                <ModelManagement />
              </div>
              
              {/* CSVデータ編集セクション - 常時表示 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">データ管理</h3>
                <ModelDataManagement />
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">
                      {models.find(m => m.id === selectedModelId)?.displayName} の月別データ
                    </h4>
                    
                    {(() => {
                      // データの整合性を確保するためのデバッグ情報
                      console.log('🔍 CSVデータ管理: 選択されたモデルID:', selectedModelId);
                      console.log('🔍 CSVデータ管理: 選択されたモデル名:', models.find(m => m.id === selectedModelId)?.displayName);
                      console.log('🔍 CSVデータ管理: 利用可能なmodelData keys:', Object.keys(modelData));
                      console.log('🔍 CSVデータ管理: modelData全体:', modelData);
                      
                      // 各キーの詳細情報を表示
                      Object.entries(modelData).forEach(([key, value]) => {
                        if (Array.isArray(value)) {
                          console.log(`🔍 ${key}: 配列形式 ${value.length}件`);
                        } else if (typeof value === 'object' && value !== null && 'data' in value) {
                          const data = (value as { data: FanClubRevenueData[] }).data;
                          console.log(`🔍 ${key}: オブジェクト形式 ${data.length}件`);
                          // 最初の数件のデータを表示
                          if (data.length > 0) {
                            console.log(`🔍 ${key} の最初のデータ:`, data.slice(0, 3).map(item => ({
                              日付: item.日付,
                              モデル名: item.モデル名,
                              購入者: item.購入者,
                              金額: item.金額
                            })));
                          }
                        } else {
                          console.log(`🔍 ${key}: 不明な形式`, typeof value, value);
                        }
                      });

                      // 選択されたモデルのデータのみをフィルタリング（正確に）
                      let filteredData: FanClubRevenueData[] = [];
                      
                      if (selectedModelId && selectedModelId !== 'all') {
                        // 該当モデルの全てのキーを特定（複数月のデータを取得）
                        const modelKeys = Object.keys(modelData).filter(key => key.startsWith(`${selectedModelId}_`));
                        
                        console.log('🔍 CSVデータ管理: 検索対象モデルキー:', modelKeys);
                        
                        if (modelKeys.length > 0) {
                          // 全ての月のデータを結合
                          const allModelData: FanClubRevenueData[] = [];
                          
                          modelKeys.forEach(modelKey => {
                            const modelDataItem = modelData[modelKey];
                            console.log('🔍 CSVデータ管理: 処理中のキー:', modelKey, modelDataItem);
                            
                            if (Array.isArray(modelDataItem)) {
                              // 直接配列の場合
                              allModelData.push(...modelDataItem);
                            } else if (typeof modelDataItem === 'object' && modelDataItem !== null && 'data' in modelDataItem) {
                              // オブジェクトにdataプロパティがある場合
                              const data = (modelDataItem as { data: FanClubRevenueData[] }).data || [];
                              allModelData.push(...data);
                            }
                          });
                          
                          filteredData = allModelData;
                          console.log('🔍 CSVデータ管理: 全月のデータを取得:', filteredData.length, '件');
                          
                          // 日付の正規化処理
                          filteredData = filteredData.map(record => {
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
                          
                          console.log('🔍 CSVデータ管理: 正規化後のデータ数:', filteredData.length, '件');
                          
                          // データの内容を確認
                          if (filteredData.length > 0) {
                            console.log('🔍 CSVデータ管理: 取得したデータの内容:', filteredData.slice(0, 5).map(item => ({
                              日付: item.日付,
                              モデル名: item.モデル名,
                              購入者: item.購入者,
                              金額: item.金額
                            })));
                          }
                        } else {
                          console.log('🔍 CSVデータ管理: モデルキーが見つかりません');
                          console.log('🔍 CSVデータ管理: 利用可能なキー:', Object.keys(modelData));
                          filteredData = [];
                        }
                      } else {
                        // 全モデルのデータ
                        filteredData = [];
                      }

                      console.log('🔍 CSVデータ管理: フィルタリング後のデータ数:', filteredData.length, '件');
                      
                      if (filteredData.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <p>このモデルのデータがありません</p>
                            <p className="text-sm mt-2">CSVファイルをアップロードしてください</p>
                            <div className="mt-4 text-xs text-gray-400">
                              <p>デバッグ情報:</p>
                              <p>選択モデルID: {selectedModelId}</p>
                              <p>選択モデル名: {models.find(m => m.id === selectedModelId)?.displayName}</p>
                              <p>利用可能キー: {Object.keys(modelData).join(', ')}</p>
                              <p>modelData全体: {JSON.stringify(modelData, null, 2)}</p>
                            </div>
                          </div>
                        );
                      }
                      
                      // 月別にデータをグループ化
                      const monthlyData = new Map<string, FanClubRevenueData[]>();
                      
                      filteredData.forEach(item => {
                        if (item.日付) {
                          const date = new Date(item.日付);
                          const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                          
                          if (!monthlyData.has(monthKey)) {
                            monthlyData.set(monthKey, []);
                          }
                          monthlyData.get(monthKey)!.push(item);
                        }
                      });
                      
                      console.log('🔍 CSVデータ管理: 月別データの結果:', Array.from(monthlyData.keys()));

                      const sortedMonths = Array.from(monthlyData.keys()).sort((a, b) => {
                        const [yearA, monthA] = a.split('年');
                        const [yearB, monthB] = b.split('月');
                        const [yearB2, monthB2] = yearB.split('年');
                        const monthB3 = monthB2.split('月')[0];
                        
                        if (yearA !== yearB2) return parseInt(yearA) - parseInt(yearB2);
                        return parseInt(monthA) - parseInt(monthB3);
                      });

                      if (sortedMonths.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <p>月別データがありません</p>
                            <p className="text-sm mt-2">データ数: {Object.keys(modelData).length}件</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sortedMonths.map(month => {
                            const monthData = monthlyData.get(month)!;
                            const totalRevenue = monthData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
                            const transactionCount = monthData.length;
                            const uniqueCustomers = new Set(monthData.map(item => item.購入者 || item.顧客名)).size;
                            
                            return (
                              <div key={month} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative group">
                                <h5 className="font-medium text-gray-900 mb-3">{month}</h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">売上合計:</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(totalRevenue)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">取引件数:</span>
                                    <span className="font-medium text-gray-900">{transactionCount}件</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">顧客数:</span>
                                    <span className="font-medium text-gray-900">{uniqueCustomers}人</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">平均単価:</span>
                                    <span className="font-medium text-gray-900">
                                      {transactionCount > 0 ? formatCurrency(totalRevenue / transactionCount) : '¥0'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 編集・削除ボタン */}
                                <div className="mt-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      // 編集機能（詳細データ表示）
                                      const monthDataStr = JSON.stringify(monthData, null, 2);
                                      alert(`${month}の詳細データ:\n\n${monthDataStr}`);
                                    }}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
                                  >
                                    詳細
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`${month}のデータ（${transactionCount}件）を削除しますか？\nこの操作は取り消せません。`)) {
                                        // 削除処理
                                        handleDeleteMonthData(selectedModelId, month, monthData);
                                      }
                                    }}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {!selectedModelId && (
                  <div className="text-center py-8 text-gray-500">
                    <p>モデルを選択すると、そのモデルの月別データが表示されます</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <RevenueDashboard selectedModelId={selectedModelId} />
              </div>
            </div>
          )}


          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="mb-4">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">ファン管理</h1>
                  <p className="text-gray-600">リピーターファンの詳細分析</p>
                  <div className="mt-2 text-sm text-gray-500">
                    モデル数: {models.length} | 選択中: {selectedModelId || 'なし'}
                    {models.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        メインモデル: {models.find(m => m.isMainModel)?.displayName || 'なし'}
                      </div>
                    )}
                  </div>
                </div>

                {/* 統計カード */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                        <p className="text-sm text-gray-600">平均購入額</p>
                        <p className="text-2xl font-semibold text-gray-900">¥{Math.round(stats.averageTransactionValue).toLocaleString()}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-gray-400" />
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
                
                {/* モデル選択と表示モード切り替え */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  {/* モデル選択 */}
                  <div className="flex items-center space-x-3">
                    <label htmlFor="customer-model-select" className="text-sm font-medium text-gray-700">
                      モデル選択:
                    </label>
                    <select
                      id="customer-model-select"
                      value={selectedModelId}
                      onChange={(e) => {
                        console.log('ファン管理: モデル選択変更:', e.target.value);
                        setSelectedModelId(e.target.value);
                        // グローバル状態も更新
                        localStorage.setItem('fanclub-global-model-selection', JSON.stringify({ selectedModelId: e.target.value }));
                        window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
                          detail: { selectedModelId: e.target.value } 
                        }));
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900 min-w-[200px]"
                    >
                      <option value="">全モデル</option>
                      {models.length > 0 ? (
                        models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>モデルが見つかりません</option>
                      )}
                    </select>
                  </div>
                  
                  {/* 表示モード切り替え */}
                  <div className="flex items-center space-x-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCustomerViewMode('all')}
                        className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                          customerViewMode === 'all'
                            ? 'bg-pink-500 text-white shadow-lg'
                            : 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-pink-300'
                        }`}
                      >
                        全体データ
                      </button>
                      <button
                        onClick={() => setCustomerViewMode('monthly')}
                        className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                          customerViewMode === 'monthly'
                            ? 'bg-pink-500 text-white shadow-lg'
                            : 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-pink-300'
                        }`}
                      >
                        月毎データ
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
                                if (selectedModelId && itemData.modelId !== selectedModelId) {
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
                        const data = selectedModelId && customerViewMode === 'monthly'
                          ? allModelData.filter(record => {
                              // monthly_dataのキーからmodelIdを確認
                              const matchingKey = Object.keys(modelData).find(key => 
                                key.startsWith(`${selectedModelId}_`)
                              );
                              return matchingKey !== undefined;
                            })
                          : allModelData;
                        
                        console.log('📊 ファン管理: 分析対象データ:', data.length, '件');
                        const repeaters = getCustomerDetailInfo(data);
                        console.log('📊 ファン管理: リピーター数:', repeaters.length, '人');
                        
                        if (repeaters.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p>リピーター顧客のデータがありません</p>
                              <p className="text-sm">CSVデータをアップロードしてください</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {repeaters.map((customer, index) => {
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
                                <div key={index} className="bg-white rounded-xl shadow-lg p-4 lg:p-6">
                            {/* ヘッダーセクション */}
                            <div className="mb-4 border-b border-gray-100 pb-4">
                              <div className="flex items-center justify-between mb-2">
                                <h1 className="text-lg lg:text-xl font-bold text-gray-900">
                                  {getMedal(index)}{customer.buyerName}
                                </h1>
                                <div className="text-right">
                                  <p className="text-xs lg:text-sm text-gray-600 mb-1">合計利用金額</p>
                                  <span className="text-2xl lg:text-3xl font-extrabold text-pink-600 block leading-none">
                                    {formatCurrency(customer.totalSpent)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs lg:text-sm text-gray-600">
                                利用開始: {formatDate(customer.firstPurchaseDate)} | 最終: {formatDate(customer.lastPurchaseDate)}
                              </p>
                            </div>

                            {/* 統計情報グリッド */}
                            <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-4">
                              {/* 合計購入回数 */}
                              <div className="bg-blue-50 p-3 lg:p-4 rounded-lg text-center">
                                <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1">購入回数</p>
                                <span className="text-lg lg:text-xl font-extrabold text-pink-600 block leading-tight">
                                  {customer.totalTransactions}回
                                </span>
                              </div>

                              {/* 平均単価 */}
                              <div className="bg-orange-50 p-3 lg:p-4 rounded-lg text-center">
                                <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1">平均単価</p>
                                <span className="text-lg lg:text-xl font-extrabold text-orange-600 block leading-tight">
                                  {formatCurrency(customer.averageTransactionValue)}
                                </span>
                              </div>
                            </div>

                            {/* 内訳セクション */}
                            <div className="grid grid-cols-1 gap-2 lg:gap-3 mt-4 pt-4 border-t border-dashed border-gray-200">
                              {/* 単品アイテム */}
                              <div className="bg-gray-50 p-3 lg:p-4 rounded-lg">
                                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 mb-2">単品アイテム</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-sm lg:text-base font-bold text-gray-900">{formatCurrency(customer.singleTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.singlePurchaseCount}個</span>
                                </div>
                              </div>

                              {/* 定期プラン */}
                              <div className="bg-gray-50 p-3 lg:p-4 rounded-lg">
                                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 mb-2">プラン</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-sm lg:text-base font-bold text-gray-900">{formatCurrency(customer.planTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.planPurchaseCount}回</span>
                                </div>
                              </div>

                              {/* サポート/寄付 */}
                              <div className="bg-gray-50 p-3 lg:p-4 rounded-lg">
                                <h3 className="text-xs lg:text-sm font-semibold text-gray-700 mb-2">チップ・スーパーコメント</h3>
                                <div className="flex justify-between items-end">
                                  <span className="text-sm lg:text-base font-bold text-gray-900">{formatCurrency(customer.tipTotal)}</span>
                                  <span className="text-xs text-gray-600">{customer.tipCount}回</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* 月別購入履歴 */}
                            {customer.monthlySpending.length > 0 && (
                              <details className="mt-4">
                                <summary className="cursor-pointer text-center text-xs lg:text-sm text-gray-600 hover:text-gray-900 bg-gray-50 py-2 px-3 lg:px-4 rounded-lg">
                                  購入履歴を詳しく見る ({customer.monthlySpending.length}ヶ月)
                                </summary>
                                <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                                  {customer.monthlySpending.map((month, idx) => {
                                    const displayYear = month.year && !isNaN(month.year) ? month.year : '不明';
                                    const displayMonth = month.month && !isNaN(month.month) ? month.month : '不明';
                                    
                                    return (
                                      <div key={idx} className="bg-gray-50 rounded-lg p-2 lg:p-3 text-xs">
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
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-2">カレンダー分析</h1>
                <p className="text-sm lg:text-base text-gray-600">購入パターンの時間的・季節的分析</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
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
              </div>
            </div>
          )}

          {/* 設定タブ */}
          {activeTab === 'settings' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">設定</h3>
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">アカウント情報</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">名前:</span> {authSession.user.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">メールアドレス:</span> {authSession.user.email}
                      </p>
                    </div>
                  </div>
                  
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">デバッグ</h4>
                    <div className="space-y-2">
                      <button
                        onClick={async () => {
                          console.log('🔍 Supabaseデバッグ開始');
                          const result = await debugSupabaseConnection();
                          console.log('🔍 デバッグ結果:', result);
                          setMessage('デバッグ結果をコンソールに出力しました（F12で確認）');
                          setTimeout(() => setMessage(''), 5000);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors mr-2"
                      >
                        Supabase接続テスト
                      </button>
                      
                      <button
                        onClick={async () => {
                          setMessage('🔄 モデル同期中...');
                          const syncedCount = await syncLocalModelsToSupabase();
                          setMessage(`✅ モデル同期完了: ${syncedCount}件`);
                          setTimeout(() => setMessage(''), 5000);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors mr-2"
                      >
                        モデル同期
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">データ管理</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const preservedKeys = getPreservedKeys();
                          console.log('🔒 保持されるキー（認証関連）:', preservedKeys);
                          
                          const deletedCount = clearLocalData();
                          
                          // 状態をリセット
                          setModels([]);
                          setModelData({});
                          setSelectedModelId('');
                          
                          setMessage(`✅ ローカルデータをクリアしました（${deletedCount}件削除）`);
                          setTimeout(() => setMessage(''), 5000);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        ローカルデータをクリア
                      </button>
                      <p className="text-xs text-gray-500">
                        モデル名とCSVデータを削除します。ログイン情報は保持されます。
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">アプリケーション情報</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        バージョン: 1.0.0
                      </p>
                      <p className="text-sm text-gray-600">
                        最終更新: {new Date().toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FanClubDashboard;
