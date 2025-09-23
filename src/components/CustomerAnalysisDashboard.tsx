'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Star, Repeat } from 'lucide-react';
import { ModelMonthlyData, CustomerAnalysis } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { analyzeCustomerData, formatCurrency } from '@/utils/csvUtils';

export default function CustomerAnalysisDashboard() {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [analysis, setAnalysis] = useState<CustomerAnalysis | null>(null);

  useEffect(() => {
    setModelData(getModelMonthlyData());
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      const data = modelData.filter(d => d.modelId === selectedModelId);
      if (data.length > 0) {
        const allData = data.flatMap(d => d.data);
        setAnalysis(analyzeCustomerData(allData));
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
        <Users className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">顧客分析</h2>
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
        <div className="space-y-6">
          {/* 基本統計 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Repeat className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">リピーター数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.repeatCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">リピート率</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.repeatRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* トップスぺンダー */}
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>トップスぺンダー</span>
            </h3>
            <div className="space-y-3">
              {analysis.topSpenders.map((customer, index) => (
                <div key={customer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.purchaseCount}回購入</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                    <p className="text-sm text-gray-500">
                      平均: {formatCurrency(customer.averageSpent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 全リピーター */}
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Repeat className="h-5 w-5 text-green-500" />
              <span>全リピーター ({analysis.allRepeaters.length}名)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.allRepeaters.map((customer) => (
                <div key={customer.name} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.purchaseCount}回購入</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
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
