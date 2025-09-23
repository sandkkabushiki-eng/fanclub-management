'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { ModelMonthlyData } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';

interface TrendData {
  period: string;
  revenue: number;
  customers: number;
  averageSpent: number;
}

export default function MonthlyTrendsChart() {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    setModelData(getModelMonthlyData());
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      const data = modelData.filter(d => d.modelId === selectedModelId);
      const trends: TrendData[] = [];
      
      data.forEach(item => {
        const analysis = analyzeFanClubRevenue(item.data);
        trends.push({
          period: `${item.year}年${item.month}月`,
          revenue: analysis.totalRevenue,
          customers: analysis.totalCustomers,
          averageSpent: analysis.averageSpendingPerCustomer
        });
      });
      
      // 年月順にソート
      trends.sort((a, b) => {
        const [aYear, aMonth] = a.period.split('年').map(s => parseInt(s.replace('月', '')));
        const [bYear, bMonth] = b.period.split('年').map(s => parseInt(s.replace('月', '')));
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });
      
      setTrendData(trends);
    } else {
      setTrendData([]);
    }
  }, [selectedModelId, modelData]);

  const models = Array.from(new Set(modelData.map(d => ({ id: d.modelId, name: d.modelName }))));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600">
            売上: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-green-600">
            顧客数: {payload[1]?.value || 0}名
          </p>
          <p className="text-purple-600">
            平均購入額: {formatCurrency(payload[2]?.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <TrendingUp className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">月別トレンド</h2>
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

      {/* チャートタイプ選択 */}
      {trendData.length > 0 && (
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              chartType === 'bar' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>棒グラフ</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              chartType === 'line' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>折れ線グラフ</span>
          </button>
        </div>
      )}

      {/* チャート */}
      {trendData.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            月別売上トレンド
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#dc2626" name="売上" />
                </BarChart>
              ) : (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} name="売上" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!trendData.length && selectedModelId && (
        <div className="text-center py-8 text-gray-500">
          データがありません。
        </div>
      )}
    </div>
  );
}
