'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { ModelMonthlyData, RevenueAnalysis, FanClubRevenueData, Model } from '@/types/csv';
import { getModelMonthlyData, getModels } from '@/utils/modelUtils';
import { getCurrentUserDataManager } from '@/utils/userDataUtils';
import { supabase } from '@/lib/supabase';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import RevenueOptimizationSuggestions from './RevenueOptimizationSuggestions';

interface RevenueDashboardProps {
  selectedModelId: string;
}

export default function RevenueDashboard({ selectedModelId }: RevenueDashboardProps) {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [analysis, setAnalysis] = useState<RevenueAnalysis | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [localSelectedModelId, setLocalSelectedModelId] = useState<string>(selectedModelId);

  // モデルリストを読み込み
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading models for revenue dashboard...');
        
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

  // 外部から渡されたselectedModelIdが変更された場合に更新
  useEffect(() => {
    setLocalSelectedModelId(selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    const loadModelData = async () => {
      try {
        console.log('Loading model data for revenue dashboard...');
        console.log('Selected model ID:', localSelectedModelId);
        
        // 現在のユーザーのデータのみ取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('ユーザーが認証されていません');
          return;
        }
        
        const { data: monthlyData, error } = await supabase
          .from('monthly_data')
          .select('*')
          .eq('user_id', user.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false });
          
        if (error) {
          console.error('Monthly data fetch error:', error);
          const localData = getModelMonthlyData();
          console.log('Using local model data:', localData.length, 'records');
          setModelData(localData);
        } else if (monthlyData && monthlyData.length > 0) {
          console.log('Found monthly data from Supabase:', monthlyData.length, 'records');
          
          // 選択されたモデルのデータのみをフィルタリング（"all"の場合は全データ）
          const filteredData = localSelectedModelId && localSelectedModelId !== 'all'
            ? monthlyData.filter(row => row.model_id === localSelectedModelId)
            : monthlyData;
            
            console.log('Filtered data for model', localSelectedModelId, ':', filteredData.length, 'records');
          
          // SupabaseのデータをModelMonthlyData形式に変換
          const formattedData: ModelMonthlyData[] = filteredData.map(row => ({
            id: row.id,
            modelId: row.model_id,
            modelName: '', // 必要に応じてモデル名を取得
            year: row.year,
            month: row.month,
            data: row.data as FanClubRevenueData[],
            analysis: row.analysis,
            uploadedAt: row.created_at,
            lastModified: row.updated_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          
          console.log('Converted and loaded model data:', formattedData.length, 'records');
          setModelData(formattedData);
        } else {
          console.log('No monthly data in Supabase, using local storage');
          const localData = getModelMonthlyData();
          const filteredLocalData = selectedModelId && selectedModelId !== 'all'
            ? localData.filter(d => d.modelId === selectedModelId)
            : localData;
          console.log('Local model data count:', filteredLocalData.length);
          setModelData(filteredLocalData);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        const localData = getModelMonthlyData();
        const filteredLocalData = localSelectedModelId && localSelectedModelId !== 'all'
          ? localData.filter(d => d.modelId === localSelectedModelId)
          : localData;
        console.log('Fallback to local model data:', filteredLocalData.length);
        setModelData(filteredLocalData);
      }
    };

    loadModelData();
  }, [localSelectedModelId]);

  useEffect(() => {
    if (modelData.length > 0) {
      const allData = modelData.flatMap(d => d.data);
      console.log('RevenueDashboard - Total data count:', allData.length);
      console.log('RevenueDashboard - Sample data:', allData.slice(0, 3));
      console.log('RevenueDashboard - Model data months:', modelData.map(d => `${d.year}-${d.month}`));
      const analysis = analyzeFanClubRevenue(allData);
      console.log('RevenueDashboard - Monthly revenue:', analysis.monthlyRevenue);
      setAnalysis(analysis);
    } else {
      setAnalysis(null);
    }
  }, [modelData]);

  const COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3'];

  return (
    <div className="space-y-6">
      {/* モデル選択 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="revenue-model-select" className="text-sm font-medium text-gray-700">
            モデル選択:
          </label>
          <select
            id="revenue-model-select"
            value={localSelectedModelId}
            onChange={(e) => {
              console.log('売上分析: モデル選択変更:', e.target.value);
              setLocalSelectedModelId(e.target.value);
              // グローバル状態も更新
              localStorage.setItem('fanclub-global-model-selection', JSON.stringify({ selectedModelId: e.target.value }));
              window.dispatchEvent(new CustomEvent('globalModelSelectionChanged', { 
                detail: { selectedModelId: e.target.value } 
              }));
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-gray-900 min-w-[200px]"
          >
            <option value="all">全体売上</option>
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
          <div className="text-xs text-gray-500">
            モデル数: {models.length}
          </div>
        </div>
      </div>


      {/* 分析結果 */}
      {analysis && (
        <div className="space-y-6">
          {/* 基本統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総売上</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(analysis.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総顧客数</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analysis.totalCustomers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">平均購入額</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(analysis.averageSpendingPerCustomer)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">リピート率</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analysis.repeatRate.toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 収益最大化提案 */}
          <RevenueOptimizationSuggestions 
            analysis={analysis}
            modelData={modelData.flatMap(monthData => monthData.data)}
            selectedModelName={localSelectedModelId === 'all' ? undefined : models.find(m => m.id === localSelectedModelId)?.displayName}
          />

          {/* グラフエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 購入タイプ別統計 */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">購入タイプ別統計</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">{analysis.planPurchases}</div>
                  <div className="text-sm text-gray-600">プラン購入</div>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">{analysis.singlePurchases}</div>
                  <div className="text-sm text-gray-600">単品販売</div>
                </div>
              </div>
            </div>

            {/* 月別売上トレンド */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">月別売上分析</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.monthlyRevenue.map(item => ({
                    ...item,
                    売上: item.revenue,
                    month: (() => {
                      const [year, monthNum] = item.month.split('-');
                      return `${year}年${parseInt(monthNum)}月`;
                    })()
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), '売上']} />
                    <Bar dataKey="売上" fill="#ec4899" name="売上" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          {/* 月別売上分析（プラン・単品統合） */}
          {modelData.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">月別売上分析</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    // モデル管理の月データから分析
                    const monthlyStats = new Map<string, { planRevenue: number; singleRevenue: number }>();
                    
                    modelData.forEach(monthData => {
                      const monthKey = `${monthData.year}-${String(monthData.month).padStart(2, '0')}`;
                      
                      if (!monthlyStats.has(monthKey)) {
                        monthlyStats.set(monthKey, { planRevenue: 0, singleRevenue: 0 });
                      }
                      
                      const stats = monthlyStats.get(monthKey)!;
                      
                      // 各月のデータからプランと単品の売上を計算
                      monthData.data.forEach(item => {
                        const amount = Number(item.金額) || 0;
                        if (item.種類 === 'プラン購入') {
                          stats.planRevenue += amount;
                        } else if (item.種類 === '単品販売') {
                          stats.singleRevenue += amount;
                        }
                      });
                    });
                    
                    const chartData = Array.from(monthlyStats.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, stats]) => {
                        // 月の表示形式を改善（例：2024-01 → 2024年1月）
                        const [year, monthNum] = month.split('-');
                        const displayMonth = `${year}年${parseInt(monthNum)}月`;
                        
                        return {
                          month: displayMonth,
                          originalMonth: month,
                          planRevenue: stats.planRevenue,
                          singleRevenue: stats.singleRevenue
                        };
                      });
                    
                    console.log('Model data based chart data:', chartData);
                    return chartData;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'planRevenue') {
                          return [formatCurrency(Number(value)), 'プラン売上'];
                        } else if (name === 'singleRevenue') {
                          return [formatCurrency(Number(value)), '単品売上'];
                        }
                        return [formatCurrency(Number(value)), name];
                      }}
                    />
                    <Bar dataKey="planRevenue" fill="#ec4899" name="プラン売上" />
                    <Bar dataKey="singleRevenue" fill="#f472b6" name="単品売上" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">月別売上分析</h3>
              <div className="text-center py-8 text-gray-500">
                <p>月別の売上データがありません</p>
                <p className="text-sm mt-2">モデル管理で月データを登録してください</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!analysis && localSelectedModelId && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
