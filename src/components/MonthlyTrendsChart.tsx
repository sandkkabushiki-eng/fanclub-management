'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { ModelMonthlyData, Model } from '@/types/csv';
import { getModelMonthlyData, getModels } from '@/utils/modelUtils';
import { formatCurrency } from '@/utils/csvUtils';

interface MonthlyTrendsChartProps {
  selectedModelId?: string;
}

interface TrendData {
  year: number;
  month: number;
  monthLabel: string;
  totalRevenue: number;
  totalFees: number;
  totalTransactions: number;
  planPurchases: number;
  singlePurchases: number;
}

export default function MonthlyTrendsChart({ selectedModelId }: MonthlyTrendsChartProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    setModels(getModels());
    updateTrendData();
  }, [selectedModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTrendData = () => {
    let allData: ModelMonthlyData[] = [];
    
    if (selectedModelId) {
      // 特定のモデルのデータのみ
      const allModelData = getModelMonthlyData();
      allData = allModelData.filter(data => data.modelId === selectedModelId);
    } else {
      // 全モデルのデータ
      allData = getModelMonthlyData();
    }

    // 年月でグループ化して集計
    const groupedData = allData.reduce((acc, data) => {
      const key = `${data.year}-${data.month}`;
      if (!acc[key]) {
        acc[key] = {
          year: data.year,
          month: data.month,
          monthLabel: `${data.year}年${data.month}月`,
          totalRevenue: 0,
          totalFees: 0,
          totalTransactions: 0,
          planPurchases: 0,
          singlePurchases: 0,
        };
      }
      
      acc[key].totalRevenue += data.analysis.totalRevenue;
      acc[key].totalFees += data.analysis.totalFees;
      acc[key].totalTransactions += data.analysis.totalTransactions;
      acc[key].planPurchases += data.analysis.planPurchases;
      acc[key].singlePurchases += data.analysis.singlePurchases;
      
      return acc;
    }, {} as Record<string, TrendData>);

    // 年月順でソート
    const sortedData = Object.values(groupedData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    setTrendData(sortedData);
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  if (trendData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          月別売上推移
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedModelId ? `${selectedModel?.displayName}の` : ''}データがありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          月別売上推移
          {selectedModel && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              - {selectedModel.displayName}
            </span>
          )}
        </h3>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            折れ線
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            棒グラフ
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'totalRevenue' ? formatCurrency(value) : 
                  name === 'totalFees' ? formatCurrency(value) : 
                  value.toLocaleString(),
                  name === 'totalRevenue' ? '売上' :
                  name === 'totalFees' ? '手数料' :
                  name === 'totalTransactions' ? '取引数' :
                  name === 'planPurchases' ? 'プラン購入' :
                  name === 'singlePurchases' ? '単品販売' : name
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="#10B981" 
                strokeWidth={2}
                name="売上"
              />
              <Line 
                type="monotone" 
                dataKey="totalFees" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="手数料"
              />
              <Line 
                type="monotone" 
                dataKey="totalTransactions" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="取引数"
              />
            </LineChart>
          ) : (
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'totalRevenue' ? formatCurrency(value) : 
                  name === 'totalFees' ? formatCurrency(value) : 
                  value.toLocaleString(),
                  name === 'totalRevenue' ? '売上' :
                  name === 'totalFees' ? '手数料' :
                  name === 'totalTransactions' ? '取引数' :
                  name === 'planPurchases' ? 'プラン購入' :
                  name === 'singlePurchases' ? '単品販売' : name
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="totalRevenue" fill="#10B981" name="売上" />
              <Bar dataKey="totalFees" fill="#EF4444" name="手数料" />
              <Bar dataKey="totalTransactions" fill="#3B82F6" name="取引数" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 統計サマリー */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-md text-center">
          <p className="text-sm text-gray-600">総売上</p>
          <p className="font-bold text-lg text-green-600">
            {formatCurrency(trendData.reduce((sum, data) => sum + data.totalRevenue, 0))}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md text-center">
          <p className="text-sm text-gray-600">総手数料</p>
          <p className="font-bold text-lg text-red-600">
            {formatCurrency(trendData.reduce((sum, data) => sum + data.totalFees, 0))}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md text-center">
          <p className="text-sm text-gray-600">総取引数</p>
          <p className="font-bold text-lg text-blue-600">
            {trendData.reduce((sum, data) => sum + data.totalTransactions, 0).toLocaleString()}件
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md text-center">
          <p className="text-sm text-gray-600">平均月売上</p>
          <p className="font-bold text-lg text-purple-600">
            {formatCurrency(trendData.length > 0 ? trendData.reduce((sum, data) => sum + data.totalRevenue, 0) / trendData.length : 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
