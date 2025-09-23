'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { ModelMonthlyData } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';

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

  useEffect(() => {
    const loadModelData = () => {
      console.log('Loading model data for overall dashboard...');
      const data = getModelMonthlyData();
      console.log('Overall dashboard model data loaded:', data.length, 'records');
      setModelData(data);
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
          modelMap.set(data.modelId, {
            modelId: data.modelId,
            modelName: data.modelName,
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
  }, [modelData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">全体ダッシュボード</h2>
      </div>

      {/* 全体統計 */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">総売上</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overallStats.totalRevenue)}
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
                  {overallStats.totalCustomers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">総取引数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats.totalTransactions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">平均購入額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overallStats.averageSpendingPerCustomer)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">リピート率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats.repeatRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* モデル別統計 */}
      {modelStats.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            モデル別売上ランキング
          </h3>
          <div className="space-y-3">
            {modelStats.map((model, index) => (
              <div key={model.modelId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{model.modelName}</p>
                    <p className="text-sm text-gray-500">
                      {model.customers}名の顧客 • {model.transactions}件の取引
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

      {!overallStats && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
