'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Shield,
  Sparkles,
  LogOut,
  User,
  Info,
  Settings as SettingsIcon
} from 'lucide-react';
import { CSVData, FanClubRevenueData } from '@/types/csv';
import { upsertModelMonthlyData, getModels, getModelsFromSupabase } from '@/utils/modelUtils';
import { getCurrentUserDataManager } from '@/utils/userDataUtils';
import { saveModelMonthlyDataToSupabase } from '@/utils/supabaseUtils';
import { calculateModelStats } from '@/utils/statsUtils';
import { authManager } from '@/lib/auth';
import { AuthSession } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { getCustomerDetailInfo, formatCurrency, analyzeFanClubRevenue } from '@/utils/csvUtils';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelDataManagement from '@/components/ModelDataManagement';
import ModelManagement from '@/components/ModelManagement';
import CalendarAnalysis from '@/components/CalendarAnalysis';
import RevenueDashboard from '@/components/RevenueDashboard';
import RevenueOptimizationSuggestions from '@/components/RevenueOptimizationSuggestions';
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
  authSession: AuthSession;
  onLogout: () => Promise<void>;
}

const FanClubDashboard: React.FC<FanClubDashboardProps> = ({ authSession: propAuthSession, onLogout }) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(propAuthSession);
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'revenue' | 'customers' | 'csv' | 'calendar' | 'ai' | 'settings'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelData, setModelData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string>('');
  const [customerViewMode, setCustomerViewMode] = useState<'all' | 'monthly'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // AI分析用のstate
  const [aiSelectedModelId, setAiSelectedModelId] = useState<string>('all');
  const [aiAnalysisGenerated, setAiAnalysisGenerated] = useState(false);
  const [isGeneratingAiAnalysis, setIsGeneratingAiAnalysis] = useState(false);
  
  // グローバルなモデル選択状態を使用
  const { selectedModelId, setSelectedModelId, models, setModels, mainModel } = useGlobalModelSelection();

  // グローバル状態の初期化を確認
  useEffect(() => {
    if (selectedModelId && models.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('🌟 ファン管理: グローバル状態から初期化:', selectedModelId);
    }
  }, [selectedModelId, models]);

  // グローバルなモデル選択変更をリッスン
  const handleGlobalModelSelectionChange = useCallback((globalSelectedModelId: string) => {
    if (process.env.NODE_ENV === 'development') {
    console.log('🌟 ファン管理: グローバルモデル選択変更:', globalSelectedModelId);
    }
    setSelectedModelId(globalSelectedModelId);
  }, []);

  useGlobalModelSelectionListener(handleGlobalModelSelectionChange);

  // ユーザー固有のストレージキーを取得（modelUtils.tsと同じ方法）
  const getUserStorageKey = (baseKey: string): string => {
    const currentUser = authManager.getCurrentUser();
    const userId = currentUser?.id || 'default';
    return `${baseKey}-${userId}`;
  };

  // デバッグ用: ストレージの内容を確認（開発環境のみ）
  const debugStorageContents = () => {
    if (process.env.NODE_ENV !== 'development') return;
    
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
        if (process.env.NODE_ENV === 'development') {
          console.log(`📦 データを移行しました: ${oldKey} → ${newKey}`);
        }
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
    const loadInitialData = async () => {
      try {
        // 認証セッションがない場合はスキップ
        if (!authSession?.user?.id) {
          if (process.env.NODE_ENV === 'development') {
          console.log('📊 認証セッションがないため、データ読み込みをスキップ');
          }
          return;
        }
        
        // デバッグ: ストレージの内容を確認（開発環境のみ）
        debugStorageContents();
        
        // 古いデータを新しいキーに移行（初回のみ）
        migrateOldData('fanclub-model-data');
        
        // 🔥 Supabaseから直接モデルを取得（唯一の真実のソース）
        if (process.env.NODE_ENV === 'development') {
          console.log('🗄️ Supabaseからモデルを読み込み開始...');
        }
        const currentModels = await getModelsFromSupabase();
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Supabaseからモデルを取得:', currentModels.length, '件');
        }
        setModels(currentModels);
        
        const mainModel = currentModels.find(m => m.isMainModel);
        if (mainModel && process.env.NODE_ENV === 'development') {
          console.log('⭐ メインモデル:', mainModel.displayName);
        }
        
        // ローカルストレージからデータを読み込み（ユーザー固有）
        const userDataKey = getUserStorageKey('fanclub-model-data');
        const localData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
        setModelData(localData);
        if (process.env.NODE_ENV === 'development') {
        console.log('📊 ユーザー固有のデータを読み込みました:', Object.keys(localData).length, '件');
        console.log('📊 データの詳細:', Object.keys(localData));
        }
        
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
      if (process.env.NODE_ENV === 'development') {
      console.log('🌟 ファン管理: メインモデル変更イベント受信:', modelId);
      }
      
      // ユーザーデータマネージャーを使って最新のモデルデータを取得
      const userDataManager = getCurrentUserDataManager();
      if (userDataManager) {
        const userModels = await userDataManager.getUserModels();
        if (process.env.NODE_ENV === 'development') {
        console.log('🌟 ファン管理: 最新モデルデータ:', userModels.length, '件');
        }
        setModels(userModels);
      } else {
        // フォールバック
        const modelsData = getModels();
        setModels(modelsData);
      }
      
      // メインモデルが解除された場合（modelIdがnull）
      if (modelId === null) {
        if (process.env.NODE_ENV === 'development') {
        console.log('🌟 ファン管理: メインモデル解除、最初のモデルを選択');
        }
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

  // 🔥 データ更新イベントをリッスン（CSVアップロード後の即時反映）
  useEffect(() => {
    const handleDataUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { modelId, year, month, timestamp } = customEvent.detail;
      console.log('🔄 データ更新イベント受信:', { modelId, year, month, timestamp });
      
      try {
        // Supabaseから最新の月次データを取得
        if (authSession) {
          const { data: supabaseData, error } = await supabase
            .from('monthly_data')
            .select('*')
            .eq('user_id', authSession.user.id)
            .order('year', { ascending: false })
            .order('month', { ascending: false });
          
          if (error) {
            console.error('データ再読み込みエラー:', error);
          } else if (supabaseData && supabaseData.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Supabaseから最新データを取得:', supabaseData.length, '件');
            }
            
            // データを変換
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
            
            // 状態を更新（即座にUIに反映）
            setModelData(supabaseModelData);
            
            // LocalStorageも更新
            const userDataKey = getUserStorageKey('fanclub-model-data');
            localStorage.setItem(userDataKey, JSON.stringify(supabaseModelData));
            
            console.log('✅ ダッシュボードデータを更新しました');
          }
        }
        
        // モデルリストも再読み込み
        const updatedModels = await getModelsFromSupabase();
        setModels(updatedModels);
        
      } catch (error) {
        console.error('データ更新処理エラー:', error);
      }
    };

    window.addEventListener('dataUpdated', handleDataUpdated);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdated);
    };
  }, [authSession]);

  const handleDataLoaded = async (data: CSVData[], year: number, month: number, modelId: string) => {
    try {
      setMessage('');
      console.log('📤 CSVデータアップロード開始:', { modelId, year, month, dataCount: data.length });
      
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
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ モデルをSupabaseに保存しました');
            }
            
            // 2. モデルが保存されたら月別データを保存
          await saveModelMonthlyDataToSupabase(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Supabaseへの保存が完了しました');
            }
          } else {
            console.warn('⚠️ モデルの保存に失敗しました。ローカルストレージのみに保存します。');
          }
        } catch (supabaseError) {
          console.error('Supabase保存エラー:', supabaseError);
          // Supabaseの保存に失敗してもローカルストレージには保存されているので続行
        }
      }
      
      setMessage('✨ CSVデータのアップロードが完了しました！');
      
      // 🔥 データを再読み込み（Supabaseから最新データを取得）
      console.log('🔄 ダッシュボードデータを再読み込み中...');
      
      // モデルを再読み込み
      const updatedModels = await getModelsFromSupabase();
      setModels(updatedModels);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ モデル再読み込み完了:', updatedModels.length, '件');
      }
      
      // LocalStorageからも月次データを再読み込み
      const userDataKey = getUserStorageKey('fanclub-model-data');
      const updatedData = JSON.parse(localStorage.getItem(userDataKey) || '{}') as Record<string, unknown>;
      setModelData(updatedData);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 月次データ再読み込み完了');
      }
      
      // 🔥 イベントを発火してすべてのコンポーネントに通知
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { modelId, year, month, timestamp: Date.now() } 
      }));
      if (process.env.NODE_ENV === 'development') {
        console.log('📢 dataUpdatedイベントを発火');
      }
      
      // 🔥 強制的にUIを再レンダリング
      setMessage('✨ CSVデータのアップロードが完了しました！ダッシュボードを更新中...');
      
      setTimeout(() => {
        setMessage('');
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ ダッシュボード更新完了');
        }
      }, 3000);
      
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
                  if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Supabaseから削除完了');
                  }
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
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Supabaseに保存完了');
              }
                }
              }
            }
          } catch (supabaseError) {
            console.error('Supabase保存エラー:', supabaseError);
          }
        }
        
        setMessage(`✅ ${month}のデータ（${monthData.length}件）を削除しました`);
        setTimeout(() => setMessage(''), 3000);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 月別データ削除完了');
        }
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
    { icon: Calendar, label: 'カレンダー分析', active: activeTab === 'calendar' },
    { icon: Sparkles, label: 'AI分析', active: activeTab === 'ai' }
  ];

  const getModelStats = (): ModelStats => {
    if (process.env.NODE_ENV === 'development') {
    console.log('📊 ファン管理統計計算開始');
    console.log('📊 選択されたモデルID:', selectedModelId);
    console.log('📊 modelData keys:', Object.keys(modelData));
    console.log('📊 modelData values:', Object.values(modelData).length);
    }
    
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

    if (process.env.NODE_ENV === 'development') {
    console.log('📊 フィルタリング後のデータ数:', filteredData.length);
    }

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
    console.log('📅 月別データ取得:', { year, month, selectedModelId });
    console.log('📦 modelData keys:', Object.keys(modelData));
    
    // modelDataのキーは "{modelId}_{year}_{month}" 形式
    // 選択されたモデルと年月に一致するデータを取得
    const allData = Object.entries(modelData).flatMap(([key, item]) => {
      // キーから年月を抽出
      const keyParts = key.split('_');
      if (keyParts.length >= 3) {
        const keyModelId = keyParts[0];
        const keyYear = parseInt(keyParts[1]);
        const keyMonth = parseInt(keyParts[2]);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 キー解析:', { key, keyModelId, keyYear, keyMonth, targetYear: year, targetMonth: month });
        }
        
        // 年月が一致し、かつモデルが選択されていない or モデルIDが一致する場合
        if (keyYear === year && keyMonth === month) {
          if (!selectedModelId || keyModelId === selectedModelId) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ 一致:', { key, keyYear, keyMonth });
            }
            
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null && 'data' in item) {
        const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
          ? (item as { data: FanClubRevenueData[] }).data 
          : [];
              console.log('📊 データ取得:', data.length, '件');
              return data;
            }
          } else {
            console.log('⏭️ モデルIDが不一致:', { selectedModelId, keyModelId });
          }
        } else {
          console.log('⏭️ 年月が不一致');
        }
      }
      return [];
    }) as FanClubRevenueData[];
    
    console.log('📊 月別データ取得結果:', allData.length, '件');
    return allData;
  };

  // 🔥 useMemoで統計を計算（modelDataまたはselectedModelIdが変更されたら自動再計算）
  const stats = useMemo(() => {
    console.log('📊 統計再計算トリガー:', { 
      modelDataKeys: Object.keys(modelData).length, 
      selectedModelId,
      customerViewMode,
      selectedYear,
      selectedMonth
    });
    
    // ファン管理の表示モードに応じてデータをフィルタリング
    let filteredData: FanClubRevenueData[] = [];
    
    if (customerViewMode === 'monthly') {
      // 月別データモード: 選択された年月のデータのみ
      filteredData = Object.entries(modelData).flatMap(([key, item]) => {
        const keyParts = key.split('_');
        if (keyParts.length >= 3) {
          const keyModelId = keyParts[0];
          const keyYear = parseInt(keyParts[1]);
          const keyMonth = parseInt(keyParts[2]);
          
          // 年月が一致し、かつモデルが選択されていない or モデルIDが一致する場合
          if (keyYear === selectedYear && keyMonth === selectedMonth) {
            if (!selectedModelId || keyModelId === selectedModelId) {
              if (typeof item === 'object' && item !== null && 'data' in item) {
                const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
                  ? (item as { data: FanClubRevenueData[] }).data 
                  : [];
                return data;
              }
            }
          }
      }
      return [];
    }) as FanClubRevenueData[];
    } else {
      // 全体データモード: 選択されたモデルの全データ
      filteredData = Object.entries(modelData).flatMap(([key, item]) => {
        if (selectedModelId) {
          // モデルが選択されている場合、そのモデルのデータのみ
          if (key.startsWith(`${selectedModelId}_`)) {
            if (typeof item === 'object' && item !== null && 'data' in item) {
              const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
                ? (item as { data: FanClubRevenueData[] }).data 
                : [];
              return data;
            }
          }
          return [];
        } else {
          // モデルが選択されていない場合、全データ
          if (typeof item === 'object' && item !== null && 'data' in item) {
            const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
              ? (item as { data: FanClubRevenueData[] }).data 
              : [];
            return data;
          }
          return [];
        }
      }) as FanClubRevenueData[];
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 フィルタリング後のデータ数:', filteredData.length);
    }
    
    // 統計を計算
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
    
    const calculatedStats = {
      totalRevenue,
      totalCustomers,
      repeatRate,
      averageTransactionValue,
      repeatCustomers // リピーター数を追加
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 計算された統計:', calculatedStats);
    }
    return calculatedStats;
  }, [modelData, selectedModelId, customerViewMode, selectedYear, selectedMonth]);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 modelData詳細:', JSON.stringify(modelData, null, 2));
    console.log('📊 selectedModelId:', selectedModelId);
  }

  // 🔥 useMemoでモデル別統計を計算（modelDataまたはmodelsが変更されたら自動再計算）
  const individualModelStats = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 モデル別統計再計算トリガー');
    }
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
    
    const result = Array.from(modelMap.values()).sort((a, b) => b.revenue - a.revenue);
    console.log('📊 モデル別統計計算完了:', result.length, '件');
    return result;
  }, [modelData, models]);

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
                            item.label === 'カレンダー分析' ? 'calendar' :
                            item.label === 'AI分析' ? 'ai' : 'overview');
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
              {activeTab === 'ai' && 'AI分析'}
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
          {activeTab === 'overview' ? (
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
          ) : null}
          {activeTab === 'models' ? (
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
          ) : null}
          {activeTab === 'csv' ? (
            <div className="space-y-4 lg:space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>
          ) : null}
          {activeTab === 'revenue' ? <div className="space-y-4 lg:space-y-6"><div className="bg-white rounded-lg border border-gray-200 p-6"><RevenueDashboard selectedModelId={selectedModelId} /></div></div> : null}
          {activeTab === 'customers' ? (
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
                
                {/* モデル選択とデータ期間切り替え */}
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
                  
                  {/* データ期間切り替え */}
                  <div className="flex items-center space-x-4">
                    {/* 全体データ / 月毎データ */}
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
                          <p className="text-2xl font-semibold text-gray-900">{stats.repeatCustomers}</p>
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
                  
                  {/* リピーター顧客ランキング */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      リピーター顧客ランキング
                    </h3>
                    
                    {/* リスト表示 */}
                    <div className="overflow-x-auto">
                        {(() => {
                          // データを取得
                          const allModelData = customerViewMode === 'all' 
                            ? Object.values(modelData).flatMap(item => {
                                if (Array.isArray(item)) return item;
                                if (typeof item === 'object' && item !== null && 'data' in item) {
                                  const itemData = item as { data: FanClubRevenueData[]; modelId?: string };
                                  const data = Array.isArray(itemData.data) ? itemData.data : [];
                                  
                                  if (selectedModelId && itemData.modelId !== selectedModelId) {
                                    return [];
                                  }
                                  
                                  return data;
                                }
                                return [];
                              }) as FanClubRevenueData[]
                            : getMonthlyData(selectedYear, selectedMonth);
                          
                          const data = selectedModelId && customerViewMode === 'monthly'
                            ? allModelData.filter(record => {
                                const matchingKey = Object.keys(modelData).find(key => 
                                  key.startsWith(`${selectedModelId}_`)
                                );
                                return matchingKey !== undefined;
                              })
                            : allModelData;
                          
                          const repeaters = getCustomerDetailInfo(data);
                          
                          if (repeaters.length === 0) {
                            return (
                              <div className="text-center py-12 text-gray-500">
                                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <p className="text-lg">リピーター顧客のデータがありません</p>
                                <p className="text-sm mt-2">CSVデータをアップロードしてください</p>
                  </div>
                            );
                          }
                          
                          return (
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">順位</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">顧客名</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">合計金額</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">購入回数</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">平均単価</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">単品</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">プラン</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">チップ</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">スパコメ</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">初回購入</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">最終購入</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {repeaters.map((customer, index) => {
                                  const formatDate = (dateString: string) => {
                                    if (!dateString) return '不明';
                                    const date = new Date(dateString);
                                    if (isNaN(date.getTime())) return '不明';
                                    const year = date.getFullYear();
                                    const month = date.getMonth() + 1;
                                    const day = date.getDate();
                                    return `${year}/${month}/${day}`;
                                  };
                                  
                                  const getMedalClass = (index: number) => {
                                    if (index === 0) return 'bg-yellow-100 border-yellow-400';
                                    if (index === 1) return 'bg-gray-100 border-gray-400';
                                    if (index === 2) return 'bg-orange-100 border-orange-400';
                                    return '';
                                  };
                                  
                                  return (
                                    <tr key={index} className={`hover:bg-gray-50 transition-colors ${getMedalClass(index)}`}>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <span className="text-lg font-bold text-gray-900">
                                            {index + 1}
                                          </span>
                                          {index === 0 && <span className="ml-2 text-xl">🥇</span>}
                                          {index === 1 && <span className="ml-2 text-xl">🥈</span>}
                                          {index === 2 && <span className="ml-2 text-xl">🥉</span>}
                </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">{customer.buyerName}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-base font-bold text-pink-600">{formatCurrency(customer.totalSpent)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-semibold text-gray-900">{customer.totalTransactions}回</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-700">{formatCurrency(customer.averageTransactionValue)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-600">{customer.singlePurchaseCount}個</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(customer.singleTotal)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-600">{customer.planPurchaseCount}回</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(customer.planTotal)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-600">{customer.tipCount}回</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(customer.tipTotal)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-600">{customer.superCommentCount}回</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(customer.superCommentTotal)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-xs text-gray-600">{formatDate(customer.firstPurchaseDate)}</div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-xs text-gray-600">{formatDate(customer.lastPurchaseDate)}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {activeTab === 'calendar' ? (
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
          ) : null}
          {activeTab === 'ai' ? (
            <div className="space-y-4 lg:space-y-6">
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
                <div className="flex items-center space-x-3 mb-2">
                  <Sparkles className="w-10 h-10" />
                  <h1 className="text-2xl lg:text-3xl font-bold">AI分析</h1>
                </div>
                <p className="text-purple-100">AIがあなたのビジネスを分析し、収益最大化のための戦略的アドバイスを提供します</p>
              </div>
              
              {/* 分析設定 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">分析設定</h3>
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                  {/* モデル選択 */}
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分析対象モデル
                    </label>
                    <select
                      value={aiSelectedModelId}
                      onChange={(e) => setAiSelectedModelId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                    >
                      <option value="all">すべてのモデル</option>
                      {models.length > 0 ? (
                        models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>モデルが見つかりません</option>
                      )}
                    </select>
                  </div>
                  
                  {/* 分析生成ボタン */}
                  <button
                    onClick={() => {
                      setIsGeneratingAiAnalysis(true);
                      // アニメーション効果
                      setTimeout(() => {
                        setAiAnalysisGenerated(true);
                        setIsGeneratingAiAnalysis(false);
                      }, 1500);
                    }}
                    disabled={isGeneratingAiAnalysis}
                    className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center space-x-2 ${
                      isGeneratingAiAnalysis
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isGeneratingAiAnalysis ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>分析中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>AI分析を生成</span>
                      </>
                    )}
                  </button>
                    </div>
                  </div>
                  
              {/* 分析結果 */}
              {aiAnalysisGenerated ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                  {(() => {
                    // 選択されたモデルのデータを取得
                    const allData = Object.entries(modelData).flatMap(([key, item]) => {
                      if (aiSelectedModelId !== 'all') {
                        // 特定のモデルのデータのみ
                        if (!key.startsWith(`${aiSelectedModelId}_`)) {
                          return [];
                        }
                      }
                      
                      if (Array.isArray(item)) return item;
                      if (typeof item === 'object' && item !== null && 'data' in item) {
                        const monthData = item as { data: FanClubRevenueData[] };
                        return Array.isArray(monthData.data) ? monthData.data : [];
                      }
                      return [];
                    }) as FanClubRevenueData[];
                    
                    // 分析データを取得
                    const analysis = analyzeFanClubRevenue(allData);
                    
                    return (
                      <RevenueOptimizationSuggestions
                        analysis={analysis}
                        modelData={allData}
                        selectedModelName={aiSelectedModelId && aiSelectedModelId !== 'all' 
                          ? models.find(m => m.id === aiSelectedModelId)?.displayName 
                          : undefined}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300 p-12 text-center">
                  <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">AI分析を開始してください</h3>
                  <p className="text-gray-600 mb-4">
                    分析対象のモデルを選択し、「AI分析を生成」ボタンをクリックしてください
                  </p>
                  <p className="text-sm text-gray-500">
                    AIがあなたのデータを分析し、優先度の高い改善提案を提示します
                  </p>
                </div>
              )}
            </div>
          ) : null}
          {activeTab === 'settings' ? (
            <div className="space-y-4 lg:space-y-6">
              {/* アカウント情報カード */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  <div>
                      <h3 className="text-xl font-semibold text-white">アカウント情報</h3>
                      <p className="text-sm text-pink-100">ログイン中のアカウント情報</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">名前</p>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {authSession.user.name || '未設定'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">メールアドレス</p>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {authSession.user.email}
                      </p>
                    </div>
                  </div>
                  
                  {authSession.user.createdAt && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-green-600" />
                </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">アカウント作成日</p>
                        <p className="text-base font-semibold text-gray-900">
                          {new Date(authSession.user.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
              </div>
            </div>
          )}
                </div>
              </div>

              {/* アプリケーション情報カード */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">アプリケーション情報</h3>
                      <p className="text-sm text-blue-100">システム情報とバージョン</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <SettingsIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">バージョン</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">1.0.0</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">最終更新</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date().toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">セキュリティ</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      有効
                    </span>
                  </div>
                </div>
              </div>

              {/* ログアウトセクション */}
              <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <LogOut className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">セッション管理</h3>
                      <p className="text-sm text-red-100">アカウントからログアウトします</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 mb-2">
                      <strong>ログアウトすると：</strong>
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                      <li>現在のセッションが終了します</li>
                      <li>再度ログインが必要になります</li>
                      <li>保存されていない変更は失われる可能性があります</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (confirm('ログアウトしますか？')) {
                        await onLogout();
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>ログアウト</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default FanClubDashboard;
