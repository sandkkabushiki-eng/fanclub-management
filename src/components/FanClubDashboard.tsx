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
  Settings as SettingsIcon,
  Crown,
  Zap
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
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';


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
  
  // AI分析用のstate（チャット形式）
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; modelId?: string }>>([]);
  const [isGeneratingAiAnalysis, setIsGeneratingAiAnalysis] = useState(false);
  
  // グローバルなモデル選択状態を使用
  const { selectedModelId, setSelectedModelId, models, setModels, mainModel } = useGlobalModelSelection();
  
  // サブスクリプション状態
  const { planType, isPro, currentPeriodEnd, isLoading: isSubLoading } = useSubscription();

  // AI分析タブが開かれたときに初期メッセージを追加
  useEffect(() => {
    if (activeTab === 'ai' && aiMessages.length === 0) {
      setAiMessages([{
        role: 'assistant',
        content: 'こんにちは！AI分析アシスタントです。どのモデルのデータを分析しますか？'
      }]);
    }
  }, [activeTab]);

  // モデル分析を実行する関数
  const handleModelAnalysis = useCallback(async (modelId: string) => {
    setIsGeneratingAiAnalysis(true);
    
    try {
      // 選択されたモデルのデータを取得
      const allData = Object.entries(modelData).flatMap(([key, item]) => {
        if (modelId !== 'all') {
          // 特定のモデルのデータのみ
          if (!key.startsWith(`${modelId}_`)) {
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

      if (allData.length === 0) {
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ 選択されたモデルのデータが見つかりませんでした。CSVデータをアップロードしてください。'
        }]);
        setIsGeneratingAiAnalysis(false);
        return;
      }

      // 分析データを取得
      const analysis = analyzeFanClubRevenue(allData);
      const selectedModelName = modelId !== 'all' 
        ? models.find(m => m.id === modelId)?.displayName 
        : 'すべてのモデル';

      // 分析結果を生成
      let analysisResult = `📊 **${selectedModelName}の分析結果**\n\n`;
      
      analysisResult += `## 📈 基本統計\n`;
      analysisResult += `- **総売上**: ${formatCurrency(analysis.totalRevenue)}\n`;
      analysisResult += `- **総顧客数**: ${analysis.totalCustomers}人\n`;
      analysisResult += `- **平均購入額**: ${formatCurrency(analysis.averageTransactionValue)}\n`;
      analysisResult += `- **リピート率**: ${analysis.repeatRate.toFixed(1)}%\n`;
      analysisResult += `- **総取引数**: ${analysis.totalTransactions}件\n\n`;

      analysisResult += `## 💡 戦略的アドバイス\n\n`;

      // リピート率に基づくアドバイス
      if (analysis.repeatRate < 70) {
        analysisResult += `### 🚨 優先度: 最高\n`;
        analysisResult += `**リピート率の大幅改善が必要です**\n\n`;
        analysisResult += `現在のリピート率${analysis.repeatRate.toFixed(1)}%は業界平均を大きく下回っています。以下の施策を実施してください：\n\n`;
        analysisResult += `1. **初回購入後24時間以内にパーソナライズされたフォローアップメッセージを送信**\n`;
        analysisResult += `2. **2回目購入者限定の特別割引（15-20%OFF）を提供**\n`;
        analysisResult += `3. **購入回数に応じたロイヤリティポイントプログラムを導入**\n`;
        analysisResult += `4. **月次で限定コンテンツやライブ配信を実施して継続的なエンゲージメントを維持**\n\n`;
        analysisResult += `**期待される効果**: 売上20-35%向上が期待できます。\n\n`;
      } else if (analysis.repeatRate < 85) {
        analysisResult += `### ⚡ 優先度: 高\n`;
        analysisResult += `**リピート率をさらに向上させましょう**\n\n`;
        analysisResult += `現在のリピート率${analysis.repeatRate.toFixed(1)}%は良好ですが、さらに向上させることで顧客生涯価値を最大化できます。\n\n`;
        analysisResult += `1. **リピーター限定の特典やボーナスコンテンツを提供**\n`;
        analysisResult += `2. **定期的なコミュニケーション（メール、SNS）を強化**\n`;
        analysisResult += `3. **会員ランク制度を導入して継続的なインセンティブを提供**\n\n`;
        analysisResult += `**期待される効果**: 売上15-25%向上が期待できます。\n\n`;
      } else {
        analysisResult += `### ✅ 優先度: 中\n`;
        analysisResult += `**リピート率は優秀です！**\n\n`;
        analysisResult += `現在のリピート率${analysis.repeatRate.toFixed(1)}%は業界平均を上回っています。既存顧客の維持に加えて、新規顧客獲得にも注力しましょう。\n\n`;
      }

      // 平均購入額に基づくアドバイス
      if (analysis.averageTransactionValue < 5000) {
        analysisResult += `### 💰 平均購入額の向上\n\n`;
        analysisResult += `現在の平均購入額${formatCurrency(analysis.averageTransactionValue)}を向上させる施策：\n\n`;
        analysisResult += `1. **バンドル商品やセット商品の提案**\n`;
        analysisResult += `2. **アップセル・クロスセルの強化**\n`;
        analysisResult += `3. **限定商品やプレミアム商品の導入**\n\n`;
      }

      // 顧客数に基づくアドバイス
      if (analysis.totalCustomers < 100) {
        analysisResult += `### 👥 顧客基盤の拡大\n\n`;
        analysisResult += `現在の顧客数${analysis.totalCustomers}人を増やす施策：\n\n`;
        analysisResult += `1. **SNSマーケティングの強化**\n`;
        analysisResult += `2. **インフルエンサーとのコラボレーション**\n`;
        analysisResult += `3. **紹介プログラムの導入**\n`;
        analysisResult += `4. **無料トライアルや体験版の提供**\n\n`;
      }

      analysisResult += `## 🎯 次のステップ\n\n`;
      analysisResult += `1. 上記の施策を優先順位順に実施してください\n`;
      analysisResult += `2. 各施策の効果を定期的に測定し、改善を続けましょう\n`;
      analysisResult += `3. 顧客フィードバックを収集し、サービスを継続的に改善してください\n\n`;
      analysisResult += `何か他に知りたいことがあれば、お気軽にお聞きください！`;

      // 少し遅延を入れて自然な感じにする
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: analysisResult
      }]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AI分析エラー:', error);
      }
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 分析中にエラーが発生しました。もう一度お試しください。'
      }]);
    } finally {
      setIsGeneratingAiAnalysis(false);
    }
  }, [modelData, models]);

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

  // 🔥 useMemoで統計を計算（全モデルのデータを使用）
  const stats = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 統計再計算トリガー（全モデル）:', { 
        modelDataKeys: Object.keys(modelData).length, 
        customerViewMode,
        selectedYear,
        selectedMonth
      });
    }
    
    // 全モデルのデータを取得（selectedModelIdによるフィルタリングなし）
    let filteredData: FanClubRevenueData[] = [];
    
    if (customerViewMode === 'monthly') {
      // 月別データモード: 選択された年月の全モデルのデータ
      filteredData = Object.entries(modelData).flatMap(([key, item]) => {
        const keyParts = key.split('_');
        if (keyParts.length >= 3) {
          const keyYear = parseInt(keyParts[1]);
          const keyMonth = parseInt(keyParts[2]);
          
          // 年月が一致する全モデルのデータを取得
          if (keyYear === selectedYear && keyMonth === selectedMonth) {
            if (typeof item === 'object' && item !== null && 'data' in item) {
              const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
                ? (item as { data: FanClubRevenueData[] }).data 
                : [];
              return data;
            }
          }
        }
        return [];
      }) as FanClubRevenueData[];
    } else {
      // 全体データモード: 全モデルの全データ
      filteredData = Object.entries(modelData).flatMap(([key, item]) => {
        // 全モデルのデータを取得（selectedModelIdによるフィルタリングなし）
        if (typeof item === 'object' && item !== null && 'data' in item) {
          const data = Array.isArray((item as { data: FanClubRevenueData[] }).data) 
            ? (item as { data: FanClubRevenueData[] }).data 
            : [];
          return data;
        }
        return [];
      }) as FanClubRevenueData[];
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 フィルタリング後のデータ数（全モデル）:', filteredData.length);
    }
    
    // 統計を計算（全モデル）
    const totalRevenue = filteredData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
    const totalCustomers = new Set(filteredData.map(item => item.購入者 || item.顧客名)).size;
    const averageTransactionValue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0;
    
    // リピート率の計算（全モデル）
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
      console.log('📊 計算された統計（全モデル）:', calculatedStats);
    }
    return calculatedStats;
  }, [modelData, customerViewMode, selectedYear, selectedMonth]);
  
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarCollapsed ? 'w-20' : 'w-72'} 
        bg-white/80 backdrop-blur-xl transition-all duration-300 flex flex-col
        border-r border-gray-100/80
        fixed lg:relative inset-y-0 left-0 z-50
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="p-5 border-b border-gray-100/80">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                    ファンリピ
                  </span>
                  <p className="text-[10px] text-gray-400 font-medium -mt-0.5">売上管理システム</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 mx-auto">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all hidden lg:block"
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
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
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                item.active
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                item.active ? 'text-white' : 'text-gray-500 group-hover:text-rose-500'
              }`} />
              {!sidebarCollapsed && (
                <span className={`text-sm font-medium ${item.active ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              )}
              {item.active && !sidebarCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-100/80 bg-gray-50/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm">
                {authSession.user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{authSession.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{authSession.user.email}</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="text-sm font-medium">設定</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 border border-gray-200/80"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">ログアウト</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100/80 px-4 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
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
                <p className="text-sm text-gray-500 hidden sm:block">
                  {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                オンライン
              </div>
            </div>
          </div>
        </header>

        {/* Message Toast */}
        {message && (
          <div className={`mx-4 lg:mx-8 mt-4 p-4 rounded-2xl flex items-center gap-3 animate-scale-in shadow-lg ${
            message.includes('✨') ? 'bg-emerald-500 text-white' :
            message.includes('❌') ? 'bg-rose-500 text-white' :
            'bg-gradient-to-r from-rose-500 to-orange-500 text-white'
          }`}>
            {message.includes('✨') ? (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">✓</div>
            ) : message.includes('❌') ? (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">✕</div>
            ) : null}
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === 'overview' ? (
            <div className="space-y-8 animate-fade-in">

              {/* Stats Cards - Modern Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Revenue Card */}
                <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      {Object.keys(modelData).length}件
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">総売上</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                    ¥{stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                
                {/* Total Customers Card */}
                <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">総顧客数</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                    {stats.totalCustomers.toLocaleString()}<span className="text-lg ml-1 font-normal text-gray-400">人</span>
                  </p>
                </div>
                
                {/* Average Transaction Card */}
                <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">平均購入額</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                    ¥{Math.round(stats.averageTransactionValue).toLocaleString()}
                  </p>
                </div>
                
                {/* Repeat Rate Card */}
                <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    {stats.repeatRate >= 70 && (
                      <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        優秀
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">リピート率</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                    {stats.repeatRate.toFixed(1)}<span className="text-lg ml-0.5 font-normal text-gray-400">%</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions - Modern Design */}
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">クイックアクション</h3>
                  <span className="text-xs text-gray-400 font-medium">よく使う機能</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab('csv')}
                    className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 hover:border-rose-200 hover:bg-rose-50/50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">CSVアップロード</h4>
                      <p className="text-sm text-gray-500">新しいデータを追加</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('models')}
                    className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">モデル管理</h4>
                      <p className="text-sm text-gray-500">モデルを追加・編集</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('revenue')}
                    className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900">売上分析</h4>
                      <p className="text-sm text-gray-500">詳細な分析を表示</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Model Ranking - Modern Design */}
              {individualModelStats.length > 0 && (
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">モデル別売上ランキング</h3>
                      <p className="text-sm text-gray-500 mt-0.5">売上順に表示</p>
                    </div>
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
                      {individualModelStats.length}モデル
                    </span>
                  </div>
                  <div className="space-y-3">
                    {individualModelStats.map((model, index) => (
                      <div 
                        key={model.modelId} 
                        className="group flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 transition-all duration-200 border border-transparent hover:border-gray-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white' :
                            'bg-white text-gray-700 border border-gray-200'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{model.modelName}</p>
                            <p className="text-sm text-gray-500">
                              {model.customers}名 • {model.transactions}件の取引
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
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
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
                <ModelManagement />
              </div>
              
              {/* CSVデータ編集セクション - 常時表示 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
                <ModelDataManagement />
              </div>
            </div>
          ) : null}
          {activeTab === 'csv' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>
          ) : null}
          {activeTab === 'revenue' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
                <RevenueDashboard selectedModelId={selectedModelId} />
              </div>
            </div>
          ) : null}
          {activeTab === 'customers' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Header Card */}
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">リピーターファン分析</h3>
                    <p className="text-sm text-gray-500">
                      モデル数: {models.length} | メインモデル: {models.find(m => m.isMainModel)?.displayName || '未設定'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* モデル選択 */}
                    <select
                      id="customer-model-select"
                      value={selectedModelId}
                      onChange={(e) => {
                        setSelectedModelId(e.target.value);
                        localStorage.setItem('fanclub-global-model-selection', JSON.stringify({ selectedModelId: e.target.value }));
                        window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
                          detail: { selectedModelId: e.target.value } 
                        }));
                      }}
                      className="px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white text-gray-900 font-medium min-w-[180px] transition-all"
                    >
                      <option value="">全モデル</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                        </option>
                      ))}
                    </select>
                    
                    {/* データ期間切り替え */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setCustomerViewMode('all')}
                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          customerViewMode === 'all'
                            ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        全体データ
                      </button>
                      <button
                        onClick={() => setCustomerViewMode('monthly')}
                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          customerViewMode === 'monthly'
                            ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        月毎データ
                      </button>
                    </div>
                    
                    {customerViewMode === 'monthly' && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white text-gray-900 font-medium transition-all"
                        >
                          {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}年</option>
                          ))}
                        </select>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                          className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white text-gray-900 font-medium transition-all"
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
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">総顧客数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-rose-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">リピーター数</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.repeatCustomers}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-violet-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">平均購入額</p>
                      <p className="text-2xl font-bold text-gray-900">¥{Math.round(stats.averageTransactionValue).toLocaleString()}</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">リピート率</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.repeatRate.toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-0.5">%</span></p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Customer Ranking */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
                <div className="space-y-6">
                  
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
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
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
            <div className="flex flex-col h-full animate-fade-in">
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl p-6 lg:p-8 text-white mb-6 shadow-lg shadow-purple-500/25">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">AI分析アシスタント</h1>
                    <p className="text-purple-100 text-sm lg:text-base mt-1">ビジネスデータを分析し、収益最大化のアドバイスを提供</p>
                  </div>
                </div>
              </div>
              
              {/* チャットエリア */}
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                {/* メッセージ表示エリア */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
                  {aiMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-5 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-50 text-gray-900 border border-gray-100'
                        }`}
                      >
                        {message.role === 'assistant' && index === 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold mb-4 text-gray-700">分析するモデルを選択してください</p>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  const userMessage = { role: 'user' as const, content: 'すべてのモデルを分析してください', modelId: 'all' };
                                  setAiMessages(prev => [...prev, userMessage]);
                                  handleModelAnalysis('all');
                                }}
                                className="w-full text-left px-5 py-3 bg-white border-2 border-violet-200 rounded-xl hover:bg-violet-50 hover:border-violet-400 transition-all text-sm font-semibold text-gray-900 flex items-center gap-3"
                              >
                                <span className="text-lg">📊</span> すべてのモデル
                              </button>
                              {models.map(model => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    const userMessage = { role: 'user' as const, content: `${model.displayName}を分析してください`, modelId: model.id };
                                    setAiMessages(prev => [...prev, userMessage]);
                                    handleModelAnalysis(model.id);
                                  }}
                                  className="w-full text-left px-5 py-3 bg-white border-2 border-violet-200 rounded-xl hover:bg-violet-50 hover:border-violet-400 transition-all text-sm font-semibold text-gray-900"
                                >
                                  {model.isMainModel ? '⭐ ' : ''}{model.displayName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {message.role === 'assistant' && index > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content.split('\n').map((line, lineIndex) => {
                                // 見出しの処理
                                if (line.startsWith('## ')) {
                                  return <h2 key={lineIndex} className="text-lg font-bold mt-4 mb-2 text-gray-900">{line.replace('## ', '')}</h2>;
                                }
                                if (line.startsWith('### ')) {
                                  return <h3 key={lineIndex} className="text-base font-semibold mt-3 mb-2 text-gray-800">{line.replace('### ', '')}</h3>;
                                }
                                // 太字の処理
                                if (line.includes('**')) {
                                  const parts = line.split(/(\*\*.*?\*\*)/g);
                                  return (
                                    <p key={lineIndex} className="mb-2">
                                      {parts.map((part, partIndex) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                          return <strong key={partIndex} className="font-semibold">{part.slice(2, -2)}</strong>;
                                        }
                                        return <span key={partIndex}>{part}</span>;
                                      })}
                                    </p>
                                  );
                                }
                                // リストアイテムの処理
                                if (line.trim().startsWith('- ')) {
                                  return <li key={lineIndex} className="ml-4 mb-1">{line.replace('- ', '')}</li>;
                                }
                                const numberedListMatch = line.trim().match(/^\d+\.\s/);
                                if (numberedListMatch) {
                                  return <li key={lineIndex} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
                                }
                                // 空行
                                if (line.trim() === '') {
                                  return <br key={lineIndex} />;
                                }
                                // 通常のテキスト
                                return <p key={lineIndex} className="mb-2">{line}</p>;
                              })}
                            </div>
                          </div>
                        )}
                        {message.role === 'user' && (
                          <p className="text-sm font-medium">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isGeneratingAiAnalysis && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                          <span className="text-sm text-gray-600">分析中...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {activeTab === 'settings' ? (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              {/* アカウント情報カード */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold">
                      {authSession.user.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">アカウント情報</h3>
                      <p className="text-sm text-gray-500">プロフィールとアカウント設定</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-0 divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                        <User className="h-5 w-5 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">名前</p>
                        <p className="font-semibold text-gray-900">{authSession.user.name || '未設定'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                        <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">メールアドレス</p>
                        <p className="font-semibold text-gray-900">{authSession.user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  {authSession.user.createdAt && (
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">アカウント作成日</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(authSession.user.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* アプリケーション情報カード */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md shadow-rose-500/20">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">アプリケーション情報</h3>
                      <p className="text-sm text-gray-500">バージョンとシステム状態</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-0 divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-600">バージョン</span>
                    <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">v1.0.0</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-600">最終更新</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-600">セキュリティ</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      有効
                    </span>
                  </div>
                </div>
              </div>

              {/* サブスクリプションプランセクション */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-r ${isPro ? 'from-pink-50 to-purple-50' : 'from-gray-50 to-gray-100/50'} border-b border-gray-100 px-6 py-5`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${isPro ? 'bg-gradient-to-br from-pink-500 to-purple-500 shadow-md shadow-pink-500/20' : 'bg-gray-100'} flex items-center justify-center`}>
                      <Crown className={`h-5 w-5 ${isPro ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">サブスクリプション</h3>
                      <p className="text-sm text-gray-500">現在のプランと利用状況</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {isSubLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : isPro ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">現在のプラン</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                          <Crown className="h-3.5 w-3.5" />
                          プロプラン
                        </span>
                      </div>
                      {currentPeriodEnd && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">次回更新日</span>
                          <span className="text-sm font-medium text-gray-900">
                            {currentPeriodEnd.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center gap-2 text-pink-700">
                          <Sparkles className="h-4 w-4" />
                          <span className="text-sm font-medium">すべての機能が利用可能です</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">現在のプラン</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                          無料プラン
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>モデル登録</span>
                          <span className="font-medium">{models.length}/1人</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>データ保存</span>
                          <span className="font-medium">直近3ヶ月</span>
                        </div>
                      </div>
                      <Link href="/upgrade">
                        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-pink-500/25 hover:shadow-xl mt-4">
                          <Zap className="h-4 w-4" />
                          プロプランにアップグレード
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* ログアウトセクション */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <LogOut className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">セッション管理</h3>
                      <p className="text-sm text-gray-500">ログアウトとセッション終了</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">ログアウトすると</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• 現在のセッションが終了します</li>
                      <li>• 再度ログインが必要になります</li>
                      <li>• データはクラウドに安全に保存されます</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (window.confirm('ログアウトしますか？')) {
                        await onLogout();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30"
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

