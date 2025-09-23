'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { ModelMonthlyData, RevenueAnalysis } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';

export default function RevenueDashboard() {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [analysis, setAnalysis] = useState<RevenueAnalysis | null>(null);

  useEffect(() => {
    setModelData(getModelMonthlyData());
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

  const models = Array.from(new Set(modelData.map(d => ({ id: d.modelId, name: d.modelName }))));

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <BarChart3 className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">売上分析</h2>
      </div>

      {/* モデル選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          モデル選択
        </label>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
        >
          <option value="">モデルを選択してください</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* 分析結果 */}
      {analysis && (
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
      )}

      {!analysis && selectedModelId && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
