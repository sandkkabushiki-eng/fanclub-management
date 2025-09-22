'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { ModelMonthlyData } from '@/types/csv';
import { getModelMonthlyData, getModels } from '@/utils/modelUtils';
import { formatCurrency } from '@/utils/csvUtils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface OverallDashboardProps {
  // プロパティは現在不要
}

interface OverallStats {
  totalRevenue: number;
  totalFees: number;
  totalTransactions: number;
  totalCustomers: number;
  averageTransactionValue: number;
  monthlyGrowth: number;
}

interface ModelStats {
  modelId: string;
  modelName: string;
  totalRevenue: number;
  totalTransactions: number;
  months: number;
  averageMonthlyRevenue: number;
}

export default function OverallDashboard({}: OverallDashboardProps) {
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<Array<{
    year: number;
    month: number;
    monthLabel: string;
    totalRevenue: number;
    totalFees: number;
    totalTransactions: number;
  }>>([]);

  useEffect(() => {
    updateDashboard();
  }, []);

  const updateDashboard = () => {
    const allModels = getModels();
    let allData: ModelMonthlyData[] = [];
    
    // 全モデルのデータを取得
    allData = getModelMonthlyData();

    // 全体統計を計算
    const stats: OverallStats = {
      totalRevenue: 0,
      totalFees: 0,
      totalTransactions: 0,
      totalCustomers: 0,
      averageTransactionValue: 0,
      monthlyGrowth: 0
    };

    const uniqueCustomers = new Set<string>();
    const monthlyRevenues: number[] = [];

    allData.forEach(data => {
      stats.totalRevenue += data.analysis.totalRevenue;
      stats.totalFees += data.analysis.totalFees;
      stats.totalTransactions += data.analysis.totalTransactions;
      monthlyRevenues.push(data.analysis.totalRevenue);
      
      // ユニークな顧客数を計算
      data.data.forEach(item => {
        if (item.購入者) {
          uniqueCustomers.add(item.購入者);
        }
      });
    });

    stats.totalCustomers = uniqueCustomers.size;
    stats.averageTransactionValue = stats.totalTransactions > 0 ? stats.totalRevenue / stats.totalTransactions : 0;

    // 月次成長率を計算（過去2ヶ月の平均）
    if (monthlyRevenues.length >= 2) {
      const recentMonths = monthlyRevenues.slice(-2);
      stats.monthlyGrowth = recentMonths[1] > 0 ? ((recentMonths[1] - recentMonths[0]) / recentMonths[0]) * 100 : 0;
    }

    setOverallStats(stats);

    // モデル別統計を計算
    const modelStatsData: ModelStats[] = allModels.map(model => {
      const modelData = allData.filter(data => data.modelId === model.id);
      const totalRevenue = modelData.reduce((sum, data) => sum + data.analysis.totalRevenue, 0);
      const totalTransactions = modelData.reduce((sum, data) => sum + data.analysis.totalTransactions, 0);
      
      return {
        modelId: model.id,
        modelName: model.displayName,
        totalRevenue,
        totalTransactions,
        months: modelData.length,
        averageMonthlyRevenue: modelData.length > 0 ? totalRevenue / modelData.length : 0
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    setModelStats(modelStatsData);

    // 月別データを準備
    const monthlyGrouped = allData.reduce((acc, data) => {
      const key = `${data.year}-${data.month}`;
      if (!acc[key]) {
        acc[key] = {
          year: data.year,
          month: data.month,
          monthLabel: `${data.year}年${data.month}月`,
          totalRevenue: 0,
          totalFees: 0,
          totalTransactions: 0
        };
      }
      
      acc[key].totalRevenue += data.analysis.totalRevenue;
      acc[key].totalFees += data.analysis.totalFees;
      acc[key].totalTransactions += data.analysis.totalTransactions;
      
      return acc;
    }, {} as Record<string, {
      year: number;
      month: number;
      monthLabel: string;
      totalRevenue: number;
      totalFees: number;
      totalTransactions: number;
    }>);

    const sortedMonthlyData = Object.values(monthlyGrouped).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    setMonthlyData(sortedMonthlyData);
  };

  if (!overallStats) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          全体ダッシュボード
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">データがありません</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* 全体統計カード */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          全体ダッシュボード
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-600">総売上</p>
            <p className="text-xl font-bold text-green-900">{formatCurrency(overallStats.totalRevenue)}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <DollarSign className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-red-600">総手数料</p>
            <p className="text-xl font-bold text-red-900">{formatCurrency(overallStats.totalFees)}</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-600">総取引数</p>
            <p className="text-xl font-bold text-blue-900">{overallStats.totalTransactions.toLocaleString()}件</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-600">総顧客数</p>
            <p className="text-xl font-bold text-purple-900">{overallStats.totalCustomers}人</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-orange-600">平均取引額</p>
            <p className="text-xl font-bold text-orange-900">{formatCurrency(overallStats.averageTransactionValue)}</p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <TrendingUp className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-indigo-600">月次成長率</p>
            <p className="text-xl font-bold text-indigo-900">{overallStats.monthlyGrowth.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月別売上推移 */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">月別売上推移</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
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
                    name === 'totalTransactions' ? '取引数' : name
                  ]}
                />
                <Bar dataKey="totalRevenue" fill="#10B981" name="売上" />
                <Bar dataKey="totalFees" fill="#EF4444" name="手数料" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* モデル別売上 */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">モデル別売上</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelStats.map(model => ({
                    name: model.modelName,
                    value: model.totalRevenue
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modelStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* モデル別詳細 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">モデル別詳細</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  モデル名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  総売上
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  月数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  月平均売上
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  シェア
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelStats.map((model) => (
                <tr key={model.modelId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.modelName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(model.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.totalTransactions.toLocaleString()}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.months}ヶ月
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(model.averageMonthlyRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {overallStats.totalRevenue > 0 ? ((model.totalRevenue / overallStats.totalRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
