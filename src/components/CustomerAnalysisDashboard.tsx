'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Repeat, 
  Star, 
  Calendar,
  DollarSign,
  BarChart3,
  PieChart
} from 'lucide-react';
import { CustomerAnalysis } from '@/types/csv';
import { analyzeRepeatCustomers } from '@/utils/customerAnalysisUtils';
import { formatCurrency, formatPercentage } from '@/utils/csvUtils';
import { 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface CustomerAnalysisDashboardProps {
  selectedModelId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function CustomerAnalysisDashboard({ selectedModelId }: CustomerAnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<CustomerAnalysis | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'repeaters' | 'segments'>('overview');

  useEffect(() => {
    setAnalysis(analyzeRepeatCustomers(selectedModelId));
  }, [selectedModelId]);

  if (!analysis) {
    return <div>データを読み込み中...</div>;
  }

  const {
    totalCustomers,
    repeatCustomers,
    repeatRate,
    averageSpendingPerCustomer,
    topSpenders,
    recentCustomers,
    customerSegments
  } = analysis;

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'repeaters', label: 'リピーター', icon: Repeat },
    { id: 'segments', label: '顧客セグメント', icon: PieChart }
  ];

  return (
    <div className="space-y-6">
      {/* タブナビゲーション */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as 'overview' | 'repeaters' | 'segments')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                selectedTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 概要タブ */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">総顧客数</p>
                  <p className="text-2xl font-bold text-blue-600">{totalCustomers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">リピーター数</p>
                  <p className="text-2xl font-bold text-green-600">{repeatCustomers}</p>
                </div>
                <Repeat className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">リピート率</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPercentage(repeatRate)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">平均支出</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(averageSpendingPerCustomer)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* 顧客セグメント分析 */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              顧客セグメント分析
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={customerSegments}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {customerSegments.map((entry: { segment: string; count: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* リピータータブ */}
      {selectedTab === 'repeaters' && (
        <div className="space-y-6">
          {/* トップスぺンダー */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2" />
              トップスぺンダー
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      購入者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      総支出
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      取引回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      平均取引額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      購入頻度
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終購入
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topSpenders.map((customer, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.buyerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.totalTransactions}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.averageTransactionValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.purchaseFrequency.toFixed(1)}回/月
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(customer.lastPurchaseDate).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 最近の顧客 */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              最近の顧客活動
            </h3>
            <div className="space-y-3">
              {recentCustomers.slice(0, 5).map((customer, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{customer.buyerName}</p>
                    <p className="text-sm text-gray-600">
                      {customer.totalTransactions}回購入 • 平均{formatCurrency(customer.averageTransactionValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(customer.lastPurchaseDate).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 顧客セグメントタブ */}
      {selectedTab === 'segments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {customerSegments.map((segment: { segment: string; count: number; totalSpent: number; averageSpent: number }, index: number) => (
              <div key={segment.segment} className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {segment.segment === 'high_value' ? '高価値顧客' :
                       segment.segment === 'medium_value' ? '中価値顧客' :
                       segment.segment === 'low_value' ? '低価値顧客' : '新規顧客'}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {segment.count}人
                    </p>
                    <p className="text-sm text-gray-600">
                      平均: {formatCurrency(segment.averageSpent)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(segment.totalSpent)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
