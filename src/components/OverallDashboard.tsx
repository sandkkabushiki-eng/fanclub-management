'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { ModelMonthlyData, FanClubRevenueData } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import { supabase } from '@/lib/supabase';

interface OverallStats {
  totalRevenue: number;
  totalCustomers: number;
  totalTransactions: number;
  averageSpendingPerCustomer: number;
  repeatRate: number;
}

interface ModelStats {
  modelId: string;
  modelName: string;
  revenue: number;
  customers: number;
  transactions: number;
}

export default function OverallDashboard() {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [models, setModels] = useState<{id: string, displayName: string}[]>([]);

  useEffect(() => {
    const loadModelData = async () => {
      try {
        console.log('Loading model data for overall dashboard...');
        
        // まずモデル情報を取得
        const { data: modelsData, error: modelsError } = await supabase
          .from('models')
          .select('*');
          
        if (!modelsError && modelsData) {
          const formattedModels = modelsData.map(m => ({
            id: m.id,
            displayName: m.display_name
          }));
          setModels(formattedModels);
          console.log('Loaded models:', formattedModels.length);
        }
        
        // Supabaseから全月別データを取得
        const { data: monthlyData, error } = await supabase
          .from('monthly_data')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false });
          
        if (error) {
          console.error('Monthly data fetch error:', error);
          const localData = getModelMonthlyData();
          console.log('Using local model data:', localData.length, 'records');
          setModelData(localData);
        } else if (monthlyData && monthlyData.length > 0) {
          console.log('Found monthly data from Supabase:', monthlyData.length, 'records');
          // SupabaseのデータをModelMonthlyData形式に変換
          const formattedData: ModelMonthlyData[] = monthlyData.map(row => {
            const model = modelsData?.find(m => m.id === row.model_id);
            return {
              id: row.id,
              modelId: row.model_id,
              modelName: model?.display_name || 'Unknown Model',
              year: row.year,
              month: row.month,
              data: row.data as FanClubRevenueData[],
              analysis: row.analysis,
              uploadedAt: row.created_at,
              lastModified: row.updated_at,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
          });
          
          console.log('Converted and loaded model data:', formattedData.length, 'records');
          setModelData(formattedData);
        } else {
          console.log('No monthly data in Supabase, using local storage');
          const localData = getModelMonthlyData();
          console.log('Local model data:', localData.length, 'records');
          setModelData(localData);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        const localData = getModelMonthlyData();
        console.log('Fallback to local model data:', localData.length, 'records');
        setModelData(localData);
      }
    };
    
    loadModelData();
  }, []);

  useEffect(() => {
    if (modelData.length > 0) {
      // 全体統計の計算
      const allData = modelData.flatMap(d => d.data);
      const analysis = analyzeFanClubRevenue(allData);
      
      setOverallStats({
        totalRevenue: analysis.totalRevenue,
        totalCustomers: analysis.totalCustomers,
        totalTransactions: allData.length,
        averageSpendingPerCustomer: analysis.averageSpendingPerCustomer,
        repeatRate: analysis.repeatRate
      });

      // モデル別統計の計算
      const modelMap = new Map<string, ModelStats>();
      
      modelData.forEach(data => {
        const analysis = analyzeFanClubRevenue(data.data);
        
        if (!modelMap.has(data.modelId)) {
          // モデル名を取得（Supabaseから取得したモデル情報から）
          const model = models.find(m => m.id === data.modelId);
          const modelName = model?.displayName || data.modelName || 'Unknown Model';
          
          modelMap.set(data.modelId, {
            modelId: data.modelId,
            modelName: modelName,
            revenue: 0,
            customers: 0,
            transactions: 0
          });
        }
        
        const stats = modelMap.get(data.modelId)!;
        stats.revenue += analysis.totalRevenue;
        stats.customers += analysis.totalCustomers;
        stats.transactions += data.data.length;
      });
      
      setModelStats(Array.from(modelMap.values()).sort((a, b) => b.revenue - a.revenue));
    }
  }, [modelData, models]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-blue-600">全体ダッシュボード</h2>
      </div>

      {/* 全体統計 */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">総売上</p>
                <p className="text-2xl font-bold text-gray-900 truncate" title={formatCurrency(overallStats.totalRevenue)}>
                  {formatCurrency(overallStats.totalRevenue)}
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
                  {overallStats.totalCustomers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">総取引数</p>
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {overallStats.totalTransactions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">平均購入額</p>
                <p className="text-2xl font-bold text-gray-900 truncate" title={formatCurrency(overallStats.averageSpendingPerCustomer)}>
                  {formatCurrency(overallStats.averageSpendingPerCustomer)}
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
                  {overallStats.repeatRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* モデル別統計 */}
      {modelStats.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            モデル別売上ランキング
          </h3>
          <div className="space-y-3">
            {modelStats.map((model, index) => (
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

      {!overallStats && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
