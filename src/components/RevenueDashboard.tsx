'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, PieChart } from 'lucide-react';
import { ModelMonthlyData, RevenueAnalysis } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { supabase } from '@/lib/supabase';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import { PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface RevenueDashboardProps {
  selectedModelId: string;
}

export default function RevenueDashboard({ selectedModelId }: RevenueDashboardProps) {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [analysis, setAnalysis] = useState<RevenueAnalysis | null>(null);

  useEffect(() => {
    const loadModelData = async () => {
      try {
        // Supabaseから月別データを取得
        const { data: monthlyData, error } = await supabase.from('monthly_data').select('*');
        if (error) {
          console.error('Monthly data fetch error:', error);
          setModelData(getModelMonthlyData());
        } else if (monthlyData && monthlyData.length > 0) {
          // Supabaseのデータをローカルストレージ形式に変換
          const formattedData: Record<string, Record<number, Record<number, FanClubRevenueData[]>>> = {};
          
          monthlyData.forEach((row: any) => {
            if (!formattedData[row.model_id]) {
              formattedData[row.model_id] = {};
            }
            if (!formattedData[row.model_id][row.year]) {
              formattedData[row.model_id][row.year] = {};
            }
            formattedData[row.model_id][row.year][row.month] = row.data;
          });
          
          localStorage.setItem('fanclub-model-data', JSON.stringify(formattedData));
          setModelData(getModelMonthlyData());
        } else {
          setModelData(getModelMonthlyData());
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        setModelData(getModelMonthlyData());
      }
    };

    loadModelData();
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      const data = modelData.filter(d => d.modelId === selectedModelId);
      if (data.length > 0) {
        const allData = data.flatMap(d => d.data);
        setAnalysis(analyzeFanClubRevenue(allData));
      } else {
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }
  }, [selectedModelId, modelData]);

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
                <span>月別売上トレンド</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysis.monthlyRevenue}>
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

          {/* トップバイヤー */}
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5 text-red-600" />
              <span>トップバイヤー</span>
            </h3>
            <div className="space-y-3">
              {analysis.topBuyers.map((buyer, index) => (
                <div key={buyer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{buyer.name}</p>
                      <p className="text-sm text-gray-500">{buyer.transactionCount}回購入</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(buyer.totalSpent)}
                    </p>
                    <p className="text-sm text-gray-500">
                      平均: {formatCurrency(buyer.averageSpent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
