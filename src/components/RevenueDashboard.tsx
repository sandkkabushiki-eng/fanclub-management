'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, PieChart } from 'lucide-react';
import { ModelMonthlyData, RevenueAnalysis, FanClubRevenueData } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { supabase } from '@/lib/supabase';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import { PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';

interface RevenueDashboardProps {
  selectedModelId: string;
}

export default function RevenueDashboard({ selectedModelId }: RevenueDashboardProps) {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [analysis, setAnalysis] = useState<RevenueAnalysis | null>(null);

  useEffect(() => {
    const loadModelData = async () => {
      try {
        console.log('Loading model data for revenue dashboard...');
        console.log('Selected model ID:', selectedModelId);
        
        // まず全データを取得してからフィルタリング
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
          
          // 選択されたモデルのデータのみをフィルタリング
          const filteredData = selectedModelId 
            ? monthlyData.filter(row => row.model_id === selectedModelId)
            : monthlyData;
            
          console.log('Filtered data for model', selectedModelId, ':', filteredData.length, 'records');
          
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
          const filteredLocalData = selectedModelId 
            ? localData.filter(d => d.modelId === selectedModelId)
            : localData;
          console.log('Local model data count:', filteredLocalData.length);
          setModelData(filteredLocalData);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        const localData = getModelMonthlyData();
        const filteredLocalData = selectedModelId 
          ? localData.filter(d => d.modelId === selectedModelId)
          : localData;
        console.log('Fallback to local model data:', filteredLocalData.length);
        setModelData(filteredLocalData);
      }
    };

    loadModelData();
  }, [selectedModelId]);

  useEffect(() => {
    if (modelData.length > 0) {
      const allData = modelData.flatMap(d => d.data);
      setAnalysis(analyzeFanClubRevenue(allData));
    } else {
      setAnalysis(null);
    }
  }, [modelData]);

  const COLORS = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">売上分析</h2>
      </div>

      {/* 分析結果 */}
      {analysis && (
        <div className="space-y-6">
          {/* 基本統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">総売上</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analysis.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">総顧客数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.totalCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">平均購入額</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analysis.averageSpendingPerCustomer)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">リピート率</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.repeatRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* グラフエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 購入タイプ別円グラフ */}
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-red-600" />
                <span>購入タイプ別売上</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'プラン購入', value: analysis.planPurchases, amount: analysis.totalRevenue * 0.7 },
                        { name: '単品販売', value: analysis.singlePurchases, amount: analysis.totalRevenue * 0.3 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}件`}
                    >
                      {[0, 1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 月別売上トレンド */}
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <span>月別売上分析</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysis.monthlyRevenue.map(item => ({
                    ...item,
                    month: (() => {
                      const [year, monthNum] = item.month.split('-');
                      return `${year}年${parseInt(monthNum)}月`;
                    })()
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          {/* 月別売上分析（プラン・単品統合） */}
          {modelData.length > 0 ? (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                <span>月別売上分析</span>
              </h3>
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
                    <Bar dataKey="planRevenue" fill="#3b82f6" name="プラン売上" />
                    <Bar dataKey="singleRevenue" fill="#10b981" name="単品売上" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                <span>月別売上分析</span>
              </h3>
              <div className="text-center py-8 text-gray-500">
                <p>月別の売上データがありません</p>
                <p className="text-sm mt-2">モデル管理で月データを登録してください</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!analysis && selectedModelId && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
