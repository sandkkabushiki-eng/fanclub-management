'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Star, Repeat, Calendar, DollarSign, Target, BarChart3 } from 'lucide-react';
import { ModelMonthlyData, CustomerAnalysis, FanClubRevenueData } from '@/types/csv';
import { getModelMonthlyData } from '@/utils/modelUtils';
import { supabase } from '@/lib/supabase';
import { analyzeCustomerData, formatCurrency } from '@/utils/csvUtils';

interface CustomerAnalysisDashboardProps {
  selectedModelId: string;
}

export default function CustomerAnalysisDashboard({ selectedModelId }: CustomerAnalysisDashboardProps) {
  const [modelData, setModelData] = useState<ModelMonthlyData[]>([]);
  const [analysis, setAnalysis] = useState<CustomerAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'repeaters' | 'segments' | 'lifetime'>('overview');

  useEffect(() => {
    const loadModelData = async () => {
      try {
        console.log('Loading model data for customer analysis...');
        
        // Supabaseから月別データを取得
        const { data: monthlyData, error } = await supabase.from('monthly_data').select('*');
        if (error) {
          console.error('Monthly data fetch error:', error);
          const localData = getModelMonthlyData();
          console.log('Using local model data:', localData.length, 'records');
          setModelData(localData);
        } else if (monthlyData && monthlyData.length > 0) {
          console.log('Found monthly data from Supabase:', monthlyData.length, 'records');
          // Supabaseのデータをローカルストレージ形式に変換
          const formattedData: Record<string, Record<number, Record<number, FanClubRevenueData[]>>> = {};
          
          monthlyData.forEach((row: { model_id: string; year: number; month: number; data: FanClubRevenueData[] }) => {
            if (!formattedData[row.model_id]) {
              formattedData[row.model_id] = {};
            }
            if (!formattedData[row.model_id][row.year]) {
              formattedData[row.model_id][row.year] = {};
            }
            formattedData[row.model_id][row.year][row.month] = row.data;
          });
          
          localStorage.setItem('fanclub-model-data', JSON.stringify(formattedData));
          const localData = getModelMonthlyData();
          console.log('Converted and loaded model data:', localData.length, 'records');
          setModelData(localData);
        } else {
          console.log('No monthly data in Supabase, using local storage');
          const localData = getModelMonthlyData();
          console.log('Local model data count:', localData.length);
          setModelData(localData);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        const localData = getModelMonthlyData();
        console.log('Fallback to local model data:', localData.length);
        setModelData(localData);
      }
    };

    loadModelData();
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

  // const models = Array.from(new Set(modelData.map(d => ({ id: d.modelId, name: d.modelName }))));

  const tabs = [
    { id: 'overview' as const, label: '概要', icon: BarChart3 },
    { id: 'repeaters' as const, label: 'リピーター管理', icon: Repeat },
    { id: 'segments' as const, label: '顧客セグメント', icon: Target },
    { id: 'lifetime' as const, label: '顧客生涯価値', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Users className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">顧客分析</h2>
      </div>


      {/* タブナビゲーション */}
      {analysis && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-red-50 shadow-sm border border-red-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 分析結果 */}
      {analysis && (
        <div className="space-y-6">
          {/* 基本統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">新規顧客数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.newCustomers}
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

          {/* タブコンテンツ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* トップスぺンダー */}
              <div className="bg-white border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>トップスぺンダー</span>
                </h3>
                <div className="space-y-3">
                  {analysis.topSpenders.map((customer, index) => (
                    <div key={customer.buyerName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}位
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{customer.buyerName}</p>
                          <p className="text-sm text-gray-500">{customer.totalTransactions}回購入</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                        <p className="text-sm text-gray-500">
                          平均: {formatCurrency(customer.averageTransactionValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最近の顧客 */}
              <div className="bg-white border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span>最近の顧客</span>
                </h3>
                <div className="space-y-3">
                  {analysis.recentCustomers.map((customer, index) => (
                    <div key={customer.buyerName} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}位
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{customer.buyerName}</p>
                          <p className="text-sm text-gray-500">
                            最終購入: {new Date(customer.lastPurchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.totalTransactions}回購入
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'repeaters' && (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Repeat className="h-5 w-5 text-green-500" />
                <span>全リピーター管理 ({analysis.allRepeaters.length}名)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.allRepeaters.map((customer) => (
                  <div key={customer.buyerName} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">{customer.buyerName}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>購入回数: {customer.totalTransactions}回</p>
                        <p>総購入額: {formatCurrency(customer.totalSpent)}</p>
                        <p>平均単価: {formatCurrency(customer.averageTransactionValue)}</p>
                        <p>購入頻度: {customer.purchaseFrequency.toFixed(1)}回/月</p>
                        <p>初回購入: {new Date(customer.firstPurchaseDate).toLocaleDateString()}</p>
                        <p>最終購入: {new Date(customer.lastPurchaseDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-500" />
                <span>顧客セグメント分析</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysis.customerSegments.map((segment) => (
                  <div key={segment.segment} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {segment.segment === 'high_value' && '高価値顧客'}
                      {segment.segment === 'medium_value' && '中価値顧客'}
                      {segment.segment === 'low_value' && '低価値顧客'}
                      {segment.segment === 'new' && '新規顧客'}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>人数: {segment.count}名</p>
                      <p>総売上: {formatCurrency(segment.totalSpent)}</p>
                      <p>平均単価: {formatCurrency(segment.averageSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {activeTab === 'lifetime' && (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span>顧客生涯価値</span>
              </h3>
              <div className="space-y-3">
                {analysis.customerLifetimeValue.slice(0, 20).map((customer, index) => (
                  <div key={customer.customerName} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}位
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{customer.customerName}</p>
                          <p className="text-sm text-gray-500">
                            活動期間: {customer.daysActive}日
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.purchaseCount}回購入
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
