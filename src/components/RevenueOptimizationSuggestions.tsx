'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Users, Target, ArrowUpRight } from 'lucide-react';
import { RevenueAnalysis, FanClubRevenueData } from '@/types/csv';
import { formatCurrency } from '@/utils/csvUtils';

interface RevenueOptimizationSuggestionsProps {
  analysis: RevenueAnalysis;
  modelData: FanClubRevenueData[];
  selectedModelName?: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'revenue' | 'retention' | 'acquisition' | 'pricing';
  estimatedIncrease: string;
  icon: React.ReactNode;
}

export default function RevenueOptimizationSuggestions({ 
  analysis, 
  modelData, 
  selectedModelName 
}: RevenueOptimizationSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateSuggestions();
  }, [analysis, modelData]);

  const generateSuggestions = () => {
    setIsLoading(true);
    
    // データ分析に基づく提案を生成
    const newSuggestions: Suggestion[] = [];

    // 1. リピート率改善提案
    if (analysis.repeatRate < 70) {
      newSuggestions.push({
        id: 'repeat-rate-improvement',
        title: 'リピート率向上キャンペーン',
        description: `現在のリピート率${analysis.repeatRate.toFixed(1)}%を向上させるため、2回目購入特典を提供`,
        impact: 'high',
        category: 'retention',
        estimatedIncrease: '売上15-25%向上',
        icon: <Users className="w-5 h-5" />
      });
    }

    // 2. 平均購入額向上提案
    const avgSpending = analysis.averageSpendingPerCustomer;
    if (avgSpending < 50000) {
      newSuggestions.push({
        id: 'upsell-strategy',
        title: 'アップセル戦略の実装',
        description: `平均購入額${formatCurrency(avgSpending)}を向上させるため、高額プランの推奨を強化`,
        impact: 'high',
        category: 'pricing',
        estimatedIncrease: '平均購入額20-30%向上',
        icon: <TrendingUp className="w-5 h-5" />
      });
    }

    // 3. 新規顧客獲得提案
    const newCustomerRate = ((analysis.totalCustomers - (analysis.totalCustomers * analysis.repeatRate / 100)) / analysis.totalCustomers) * 100;
    if (newCustomerRate > 50) {
      newSuggestions.push({
        id: 'new-customer-retention',
        title: '新規顧客リテンション強化',
        description: `新規顧客率${newCustomerRate.toFixed(1)}%を活かし、初回購入後のフォローアップを強化`,
        impact: 'medium',
        category: 'acquisition',
        estimatedIncrease: 'リピート率10-15%向上',
        icon: <Target className="w-5 h-5" />
      });
    }

    // 4. 時間帯最適化提案
    const timeAnalysis = analyzeTimePatterns(modelData);
    if (timeAnalysis.peakHourRevenue > 0) {
      newSuggestions.push({
        id: 'peak-time-optimization',
        title: 'ピーク時間帯マーケティング強化',
        description: `最も売上が高い時間帯（${timeAnalysis.peakHour}時台）のマーケティングを強化`,
        impact: 'medium',
        category: 'revenue',
        estimatedIncrease: '売上10-20%向上',
        icon: <ArrowUpRight className="w-5 h-5" />
      });
    }

    // 5. プラン vs 単品最適化
    const planRatio = analysis.planPurchases / (analysis.planPurchases + analysis.singlePurchases);
    if (planRatio < 0.6) {
      newSuggestions.push({
        id: 'plan-promotion',
        title: 'プラン購入促進キャンペーン',
        description: `プラン購入率${(planRatio * 100).toFixed(1)}%を向上させ、顧客生涯価値を向上`,
        impact: 'high',
        category: 'pricing',
        estimatedIncrease: '顧客生涯価値30-40%向上',
        icon: <Lightbulb className="w-5 h-5" />
      });
    }

    setSuggestions(newSuggestions);
    setIsLoading(false);
  };

  const analyzeTimePatterns = (data: FanClubRevenueData[]) => {
    const hourStats = new Map<number, { revenue: number; count: number }>();
    
    data.forEach(item => {
      if (item.日付) {
        const date = new Date(item.日付);
        const hour = date.getHours();
        const amount = Number(item.金額) || 0;
        
        if (!hourStats.has(hour)) {
          hourStats.set(hour, { revenue: 0, count: 0 });
        }
        
        const stats = hourStats.get(hour)!;
        stats.revenue += amount;
        stats.count += 1;
      }
    });

    let peakHour = 0;
    let peakHourRevenue = 0;
    
    hourStats.forEach((stats, hour) => {
      if (stats.revenue > peakHourRevenue) {
        peakHourRevenue = stats.revenue;
        peakHour = hour;
      }
    });

    return { peakHour, peakHourRevenue };
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue': return 'text-pink-600 bg-pink-50';
      case 'retention': return 'text-blue-600 bg-blue-50';
      case 'acquisition': return 'text-green-600 bg-green-50';
      case 'pricing': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">収益最大化提案</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Lightbulb className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">収益最大化提案</h3>
        <span className="text-sm text-gray-500">
          {selectedModelName ? `${selectedModelName}の` : ''}データ分析に基づく改善提案
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>現在のデータでは特別な改善提案はありません</p>
          <p className="text-sm mt-2">より多くのデータが蓄積されると、より具体的な提案が可能になります</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${getCategoryColor(suggestion.category)}`}>
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{suggestion.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact === 'high' ? '高' : suggestion.impact === 'medium' ? '中' : '低'}優先度
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">{suggestion.estimatedIncrease}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 text-sm mb-1">提案の活用方法</h4>
            <p className="text-sm text-blue-700">
              これらの提案は現在のデータ分析に基づいています。実装前に詳細な検討を行い、
              段階的に導入することをお勧めします。効果測定も忘れずに行ってください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
