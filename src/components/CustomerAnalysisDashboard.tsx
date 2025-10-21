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
        console.log('Selected model ID:', selectedModelId);
        
        // 現在のユーザーのデータのみ取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('🔒 ユーザーが認証されていません');
          return;
        }
        
        const { data: monthlyData, error } = await supabase
          .from('monthly_data')
          .select('*')
          .eq('user_id', user.id)
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
      setAnalysis(analyzeCustomerData(allData));
    } else {
      setAnalysis(null);
    }
  }, [modelData]);

  // const models = Array.from(new Set(modelData.map(d => ({ id: d.modelId, name: d.modelName }))));

  const tabs = [
    { id: 'overview' as const, label: '概要', icon: BarChart3 },
    { id: 'repeaters' as const, label: 'リピーター管理', icon: Repeat },
    { id: 'segments' as const, label: '顧客セグメント', icon: Target },
    { id: 'lifetime' as const, label: '顧客生涯価値', icon: DollarSign },
  ];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              顧客分析
            </h2>
            <p className="text-blue-600 mt-1">顧客の行動パターンと価値を分析します</p>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      {analysis && (
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 分析結果 */}
      {analysis && (
        <div className="space-y-6">
          {/* 基本統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500 font-medium">総顧客数</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {analysis.totalCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Repeat className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500 font-medium">リピーター数</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {analysis.repeatCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500 font-medium">新規顧客数</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {analysis.newCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-500 font-medium">リピート率</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {analysis.repeatRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* トップスぺンダー */}
              <div className="bg-gradient-to-br from-white to-yellow-50 border border-yellow-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">トップスぺンダー</h3>
                    <p className="text-gray-600">最も多く購入してくれる顧客</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.topSpenders.map((customer, index) => (
                    <div key={customer.buyerName} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 group">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate" title={customer.buyerName}>
                            {customer.buyerName}
                          </h4>
                          <p className="text-xs text-gray-500">{customer.totalTransactions}回購入</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">総購入額</span>
                          <span className="font-bold text-gray-900 text-sm truncate" title={formatCurrency(customer.totalSpent)}>
                            {formatCurrency(customer.totalSpent)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">平均購入額</span>
                          <span className="font-semibold text-gray-700 text-xs truncate" title={formatCurrency(customer.averageTransactionValue)}>
                            {formatCurrency(customer.averageTransactionValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最近の顧客 */}
              <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">最近の顧客</h3>
                    <p className="text-gray-600">最新の購入履歴を持つ顧客</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.recentCustomers.map((customer, index) => (
                    <div key={customer.buyerName} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 group">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate" title={customer.buyerName}>
                            {customer.buyerName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            最終購入: {new Date(customer.lastPurchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">総購入額</span>
                          <span className="font-bold text-gray-900 text-sm truncate" title={formatCurrency(customer.totalSpent)}>
                            {formatCurrency(customer.totalSpent)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">購入回数</span>
                          <span className="font-semibold text-gray-700 text-xs">
                            {customer.totalTransactions}回
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'repeaters' && (
            <div className="space-y-8">
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Repeat className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        リピーター管理
                      </h3>
                      <p className="text-green-600 mt-1">リピート顧客の詳細分析と管理</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-100 to-green-200 px-6 py-3 rounded-xl border border-green-300 shadow-sm">
                    <span className="text-green-800 font-bold text-lg">{analysis.allRepeaters.length}名のリピーター</span>
                  </div>
                </div>
              </div>

              {/* リピーター一覧 */}
              {analysis.allRepeaters.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Repeat className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">リピーターがいません</h3>
                  <p className="text-gray-600">2回以上購入した顧客がリピーターとして表示されます</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {analysis.allRepeaters.map((customer, index) => {
                    const firstPurchase = new Date(customer.firstPurchaseDate);
                    const lastPurchase = new Date(customer.lastPurchaseDate);
                    const daysBetween = Math.ceil((lastPurchase.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24));
                    const monthsBetween = Math.max(1, Math.ceil(daysBetween / 30));
                    const actualFrequency = customer.totalTransactions / monthsBetween;
                    
                    return (
                      <div key={customer.buyerName} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 group">
                        {/* カードヘッダー */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                              <span className="text-white font-bold text-xs">#{index + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 text-sm truncate" title={customer.buyerName}>
                                {customer.buyerName}
                              </h4>
                              <p className="text-xs text-gray-500">リピート</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-sm font-bold text-green-600 truncate">
                              {formatCurrency(customer.totalSpent)}
                            </div>
                          </div>
                        </div>

                        {/* 統計情報 */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-gray-50 rounded-lg p-2 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">{customer.totalTransactions}回</div>
                            <div className="text-xs text-gray-600">購入</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate" title={formatCurrency(customer.averageTransactionValue)}>
                              {formatCurrency(customer.averageTransactionValue)}
                            </div>
                            <div className="text-xs text-gray-600">平均</div>
                          </div>
                        </div>

                        {/* 購入頻度 */}
                        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-green-700">{actualFrequency.toFixed(1)}回/月</div>
                              <div className="text-xs text-green-600">頻度</div>
                            </div>
                            <div className="text-right text-xs text-green-600">
                              <div>{daysBetween}日</div>
                            </div>
                          </div>
                        </div>

                        {/* 購入履歴（コンパクト） */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">初回</span>
                            <span className="font-semibold text-gray-900">
                              {firstPurchase.toLocaleDateString('ja-JP', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">最終</span>
                            <span className="font-semibold text-gray-900">
                              {lastPurchase.toLocaleDateString('ja-JP', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">顧客セグメント分析</h3>
                  <p className="text-gray-600">顧客を価値別に分類して分析</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {analysis.customerSegments.map((segment) => (
                  <div key={segment.segment} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${
                        segment.segment === 'high_value' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                        segment.segment === 'medium_value' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                        segment.segment === 'low_value' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                        'bg-gradient-to-br from-purple-500 to-purple-600'
                      }`}>
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {segment.segment === 'high_value' && '高価値顧客'}
                        {segment.segment === 'medium_value' && '中価値顧客'}
                        {segment.segment === 'low_value' && '低価値顧客'}
                        {segment.segment === 'new' && '新規顧客'}
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">人数</span>
                        <span className="font-bold text-gray-900">{segment.count}名</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">総売上</span>
                        <span className="font-semibold text-gray-700 text-sm truncate" title={formatCurrency(segment.totalSpent)}>
                          {formatCurrency(segment.totalSpent)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">平均単価</span>
                        <span className="font-semibold text-gray-700 text-sm truncate" title={formatCurrency(segment.averageSpent)}>
                          {formatCurrency(segment.averageSpent)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {activeTab === 'lifetime' && (
            <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">顧客生涯価値</h3>
                  <p className="text-gray-600">顧客の長期的な価値を分析</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.customerLifetimeValue.slice(0, 20).map((customer, index) => (
                  <div key={customer.customerName} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate" title={customer.customerName}>
                          {customer.customerName}
                        </h4>
                        <p className="text-xs text-gray-500">活動期間: {customer.daysActive}日</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">総購入額</span>
                        <span className="font-bold text-gray-900 text-sm truncate" title={formatCurrency(customer.totalSpent)}>
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">購入回数</span>
                        <span className="font-semibold text-gray-700 text-xs">
                          {customer.purchaseCount}回
                        </span>
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
