'use client';

import { useState, useEffect } from 'react';
import { Users, Repeat, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Model, FanClubRevenueData, RepeatCustomer } from '@/types/csv';
import { getModelMonthlyData, getModels } from '@/utils/modelUtils';
import { analyzeRepeatCustomers } from '@/utils/customerAnalysisUtils';
import { formatCurrency } from '@/utils/csvUtils';

interface ModelRepeaterAnalysisProps {
  selectedModelId?: string;
}

export default function ModelRepeaterAnalysis({ selectedModelId }: ModelRepeaterAnalysisProps) {
  const [models, setModels] = useState<Model[]>([]);
         const [customerAnalysis, setCustomerAnalysis] = useState<{
           totalCustomers: number;
           repeatCustomers: number;
           newCustomers: number;
           repeatRate: number;
           averageSpendingPerCustomer: number;
           topSpenders: RepeatCustomer[];
           recentCustomers: RepeatCustomer[];
           allRepeaters: RepeatCustomer[];
           customerSegments: Array<{
             segment: string;
             count: number;
             totalSpent: number;
             averageSpent: number;
           }>;
         } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'repeaters' | 'segments'>('overview');

  useEffect(() => {
    setModels(getModels());
    updateAnalysis();
  }, [selectedModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAnalysis = () => {
    if (!selectedModelId) {
      setCustomerAnalysis(null);
      return;
    }

    // 選択されたモデルの全データを取得
    const allModelData = getModelMonthlyData();
    const modelData = allModelData.filter(data => data.modelId === selectedModelId);
    const allData: FanClubRevenueData[] = [];
    
    modelData.forEach(monthData => {
      allData.push(...monthData.data);
    });

    if (allData.length > 0) {
      const analysis = analyzeRepeatCustomers(selectedModelId);
      setCustomerAnalysis(analysis);
    } else {
      setCustomerAnalysis(null);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  if (!selectedModelId) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          リピーター分析
        </h3>
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">モデルを選択してリピーター分析を表示してください</p>
        </div>
      </div>
    );
  }

  if (!customerAnalysis) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          リピーター分析 - {selectedModel?.displayName}
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">データがありません</p>
        </div>
      </div>
    );
  }

         const {
           totalCustomers,
           repeatCustomers,
           repeatRate,
           averageSpendingPerCustomer,
           topSpenders,
           recentCustomers,
           allRepeaters,
           customerSegments
         } = customerAnalysis;

  const tabs = [
    { id: 'overview', label: '概要', icon: TrendingUp },
    { id: 'repeaters', label: 'リピーター', icon: Repeat },
    { id: 'segments', label: '顧客セグメント', icon: Users }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          リピーター分析 - {selectedModel?.displayName}
        </h3>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-600">総顧客数</p>
              <p className="text-2xl font-bold text-blue-900">{totalCustomers}人</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Repeat className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600">リピーター</p>
              <p className="text-2xl font-bold text-green-900">{repeatCustomers}人</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-purple-600">リピート率</p>
              <p className="text-2xl font-bold text-purple-900">{repeatRate.toFixed(1)}%</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-orange-600">平均支出</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(averageSpendingPerCustomer)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">トップスぺンダー</h4>
              <div className="space-y-2">
                {topSpenders.slice(0, 5).map((customer: RepeatCustomer, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900">{customer.buyerName}</p>
                      <p className="text-sm text-gray-600">{customer.totalTransactions}回購入</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-sm text-gray-600">平均: {formatCurrency(customer.averageTransactionValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">最近の顧客</h4>
              <div className="space-y-2">
                {recentCustomers.slice(0, 5).map((customer: RepeatCustomer, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900">{customer.buyerName}</p>
                      <p className="text-sm text-gray-600">最終購入: {customer.lastPurchaseDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-sm text-gray-600">{customer.totalTransactions}回</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* リピータータブ */}
      {selectedTab === 'repeaters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-gray-900">リピーター一覧（2回以上購入）</h4>
            <span className="text-sm text-gray-600">全{allRepeaters.length}名</span>
          </div>
          <div className="space-y-3">
            {allRepeaters.map((customer: RepeatCustomer, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-semibold text-gray-900">{customer.buyerName}</h5>
                    <p className="text-sm text-gray-600">
                      {customer.totalTransactions}回購入 | 平均: {formatCurrency(customer.averageTransactionValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-sm text-gray-600">リピート率: {((customer.totalTransactions - 1) / customer.totalTransactions * 100).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">初回購入</p>
                    <p className="font-medium">{customer.firstPurchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">最終購入</p>
                    <p className="font-medium">{customer.lastPurchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">購入頻度</p>
                    <p className="font-medium">{customer.purchaseFrequency.toFixed(1)}回/月</p>
                  </div>
                  <div>
                    <p className="text-gray-600">対象モデル</p>
                    <p className="font-medium">{customer.models.length}モデル</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 顧客セグメントタブ */}
      {selectedTab === 'segments' && (
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-gray-900">顧客セグメント分析</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {customerSegments.map((segment) => (
              <div key={segment.segment} className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {segment.segment === 'high_value' ? '高価値顧客' :
                       segment.segment === 'medium_value' ? '中価値顧客' :
                       segment.segment === 'low_value' ? '低価値顧客' :
                       segment.segment === 'new' ? '新規顧客' : segment.segment}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{segment.count}人</p>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <p className="text-gray-600">総支出: {formatCurrency(segment.totalSpent)}</p>
                  <p className="text-gray-600">平均: {formatCurrency(segment.averageSpent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
