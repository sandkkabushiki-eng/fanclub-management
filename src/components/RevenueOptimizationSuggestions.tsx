'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Users, Target, ArrowUpRight, AlertTriangle, Zap, DollarSign, Heart, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';
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
  impact: 'critical' | 'high' | 'medium' | 'low';
  category: 'revenue' | 'retention' | 'acquisition' | 'pricing' | 'engagement';
  estimatedIncrease: string;
  actionSteps: string[];
  businessInsight: string;
  icon: React.ReactNode;
  priority: number; // 1が最優先
}

export default function RevenueOptimizationSuggestions({ 
  analysis, 
  modelData, 
  selectedModelName 
}: RevenueOptimizationSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, [analysis, modelData]);

  const generateSuggestions = () => {
    const newSuggestions: Suggestion[] = [];
    let priority = 1;

    // 1. 【最優先】リピート率が低い場合
    if (analysis.repeatRate < 70) {
      newSuggestions.push({
        id: 'repeat-rate-critical',
        title: '🚨 リピート率の大幅改善が必要',
        description: `現在のリピート率${analysis.repeatRate.toFixed(1)}%は業界平均を大きく下回っています。顧客ロイヤルティの構築が最優先課題です。`,
        impact: 'critical',
        category: 'retention',
        estimatedIncrease: '売上20-35%向上が期待',
        actionSteps: [
          '初回購入後24時間以内にパーソナライズされたフォローアップメッセージを送信',
          '2回目購入者限定の特別割引（15-20%OFF）を提供',
          '購入回数に応じたロイヤリティポイントプログラムを導入',
          '月次で限定コンテンツやライブ配信を実施して継続的なエンゲージメントを維持'
        ],
        businessInsight: 'ファンクラブビジネスの収益の80%はリピーターから生まれます。新規獲得よりも既存顧客の維持に注力することで、長期的な収益基盤を構築できます。',
        icon: <AlertTriangle className="w-6 h-6" />,
        priority: priority++
      });
    } else if (analysis.repeatRate < 85) {
      newSuggestions.push({
        id: 'repeat-rate-improvement',
        title: 'リピート率向上キャンペーン',
        description: `リピート率${analysis.repeatRate.toFixed(1)}%をさらに向上させ、顧客生涯価値を最大化`,
        impact: 'high',
        category: 'retention',
        estimatedIncrease: '売上15-25%向上',
        actionSteps: [
          'リピーター限定の特典やボーナスコンテンツを提供',
          '購入履歴に基づいたパーソナライズされたおすすめを実施',
          '定期的なコミュニケーションでファンとの絆を深める'
        ],
        businessInsight: 'リピート率85%以上を目指すことで、安定した収益基盤を確立できます。',
        icon: <Users className="w-6 h-6" />,
        priority: priority++
      });
    }

    // 2. 平均購入額の最適化
    const avgSpending = analysis.averageSpendingPerCustomer;
    if (avgSpending < 30000) {
      newSuggestions.push({
        id: 'avg-spending-critical',
        title: '💰 客単価の戦略的引き上げ',
        description: `現在の平均購入額${formatCurrency(avgSpending)}は改善余地が大きいです。段階的な価格戦略が必要です。`,
        impact: 'critical',
        category: 'pricing',
        estimatedIncrease: '客単価30-50%向上',
        actionSteps: [
          '3段階の価格設定（ベーシック/スタンダード/プレミアム）を導入',
          'プレミアムプランに限定特典や優先アクセスを付与',
          'バンドル販売（複数アイテムのセット割引）を展開',
          '高額プラン購入者には特別なコミュニケーション機会を提供'
        ],
        businessInsight: '価格設定は顧客の知覚価値によって決まります。プレミアム体験を提供することで、高単価でも満足度を維持できます。心理学的には、中間価格帯が最も選ばれやすいため、3段階設定が効果的です。',
        icon: <DollarSign className="w-6 h-6" />,
        priority: priority++
      });
    } else if (avgSpending < 50000) {
      newSuggestions.push({
        id: 'upsell-strategy',
        title: 'アップセル戦略の実装',
        description: `平均購入額${formatCurrency(avgSpending)}からさらなる向上を目指す`,
        impact: 'high',
        category: 'pricing',
        estimatedIncrease: '平均購入額20-30%向上',
        actionSteps: [
          '購入時に関連商品やアップグレードを提案',
          '期間限定の高額プランを定期的に展開',
          '購入金額に応じた特典を段階的に設定'
        ],
        businessInsight: '既存顧客へのアップセルは新規獲得よりもコスト効率が5倍高いとされています。',
        icon: <TrendingUp className="w-6 h-6" />,
        priority: priority++
      });
    }

    // 3. プラン vs 単品のバランス最適化
    const planRatio = analysis.planPurchases / (analysis.planPurchases + analysis.singlePurchases);
    if (planRatio < 0.5) {
      newSuggestions.push({
        id: 'subscription-model',
        title: '📈 サブスクリプションモデルへの移行',
        description: `プラン購入率${(planRatio * 100).toFixed(1)}%が低く、収益の安定性に課題があります`,
        impact: 'critical',
        category: 'pricing',
        estimatedIncrease: '月次経常収益(MRR)40-60%向上',
        actionSteps: [
          '初月半額キャンペーンでプラン加入のハードルを下げる',
          'プラン限定コンテンツの価値を明確に訴求',
          '単品購入者に「3回買うよりプランがお得」と具体的に提示',
          '自動更新設定でチャーン率を低減'
        ],
        businessInsight: 'サブスクリプションモデルは予測可能な収益を生み出し、ビジネスの安定性を大幅に向上させます。業界データでは、プラン購入者の生涯価値は単品購入者の4-7倍です。',
        icon: <Award className="w-6 h-6" />,
        priority: priority++
      });
    } else if (planRatio < 0.7) {
      newSuggestions.push({
        id: 'plan-promotion',
        title: 'プラン購入促進キャンペーン',
        description: `プラン購入率${(planRatio * 100).toFixed(1)}%をさらに向上させ、安定収益を確保`,
        impact: 'high',
        category: 'pricing',
        estimatedIncrease: '顧客生涯価値30-40%向上',
        actionSteps: [
          'プラン特典の魅力を再設計',
          '期間限定のプラン加入キャンペーン実施',
          'プラン会員の満足度を可視化'
        ],
        businessInsight: 'プラン購入者は長期的な関係構築を望んでいます。継続的な価値提供が鍵です。',
        icon: <Lightbulb className="w-6 h-6" />,
        priority: priority++
      });
    }

    // 4. 新規顧客の獲得と育成
    const newCustomerRate = ((analysis.totalCustomers - (analysis.totalCustomers * analysis.repeatRate / 100)) / analysis.totalCustomers) * 100;
    if (newCustomerRate > 60) {
      newSuggestions.push({
        id: 'new-customer-onboarding',
        title: '🎯 新規顧客オンボーディング強化',
        description: `新規顧客率${newCustomerRate.toFixed(1)}%が高い今がチャンス。初回体験の最適化が重要`,
        impact: 'high',
        category: 'acquisition',
        estimatedIncrease: 'リピート率15-25%向上',
        actionSteps: [
          '購入後すぐにウェルカムメッセージと使い方ガイドを送信',
          '初回購入から7日以内に限定特典オファーを提示',
          '購入者コミュニティへの招待で帰属意識を醸成',
          '30日間のオンボーディングプログラムを設計'
        ],
        businessInsight: '最初の30日間が最も重要です。この期間に3回以上の接触があると、リピート率が60%向上するというデータがあります。新規顧客を「ファン」に育てるプロセスを設計しましょう。',
        icon: <Target className="w-6 h-6" />,
        priority: priority++
      });
    }

    // 5. 時間帯最適化
    const timeAnalysis = analyzeTimePatterns(modelData);
    if (timeAnalysis.peakHourRevenue > 0) {
      newSuggestions.push({
        id: 'peak-time-strategy',
        title: '⏰ ピークタイム戦略の最適化',
        description: `${timeAnalysis.peakHour}時台が最も活発。この時間帯を最大限活用`,
        impact: 'medium',
        category: 'engagement',
        estimatedIncrease: '売上10-20%向上',
        actionSteps: [
          `${timeAnalysis.peakHour}時台に新商品やキャンペーンを発表`,
          'ピーク時間に合わせたライブ配信やイベント実施',
          'タイムセール（時間限定特典）の活用',
          '他の時間帯への誘導施策も検討'
        ],
        businessInsight: '顧客の活動パターンに合わせたタイミング戦略は、エンゲージメントを30%向上させます。',
        icon: <Clock className="w-6 h-6" />,
        priority: priority++
      });
    }

    // 6. エンゲージメント強化
    newSuggestions.push({
      id: 'engagement-boost',
      title: '💝 ファンエンゲージメント強化',
      description: '継続的なコミュニケーションでファンとの絆を深める',
      impact: 'medium',
      category: 'engagement',
      estimatedIncrease: 'ファンロイヤルティ25-35%向上',
      actionSteps: [
        '週次または隔週でのメールマガジン配信',
        'ファン限定の舞台裏コンテンツや日常の共有',
        '定期的なQ&Aセッションやライブ配信',
        'ファンの声を反映した企画の実施'
      ],
      businessInsight: 'エンゲージメントの高いファンは、通常のファンより3倍の金額を使い、5倍のロイヤルティを示します。一方的な発信ではなく、双方向のコミュニケーションを心がけましょう。',
      icon: <Heart className="w-6 h-6" />,
      priority: priority++
    });

    // 優先度順にソート
    newSuggestions.sort((a, b) => a.priority - b.priority);

    setSuggestions(newSuggestions);
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

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border-2 border-red-300 flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>緊急</span>
          </span>
        );
      case 'high':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border-2 border-orange-300">
            高優先度
          </span>
        );
      case 'medium':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border-2 border-yellow-300">
            中優先度
          </span>
        );
      case 'low':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 border-2 border-green-300">
            低優先度
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue': return 'from-pink-500 to-rose-500';
      case 'retention': return 'from-blue-500 to-cyan-500';
      case 'acquisition': return 'from-green-500 to-emerald-500';
      case 'pricing': return 'from-purple-500 to-violet-500';
      case 'engagement': return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getCardBorderColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'border-red-300 shadow-red-100';
      case 'high': return 'border-orange-300 shadow-orange-100';
      case 'medium': return 'border-yellow-300 shadow-yellow-100';
      case 'low': return 'border-green-300 shadow-green-100';
      default: return 'border-gray-300';
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium">分析データが不足しています</p>
        <p className="text-sm mt-2">CSVデータをアップロードすると、AIによる提案が表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center space-x-3 mb-3">
          <Lightbulb className="w-8 h-8 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-900">AI戦略提案</h3>
        </div>
        <p className="text-gray-700">
          {selectedModelName ? `${selectedModelName}の` : ''}データ分析に基づく、優先度順の改善提案です
        </p>
        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-semibold">{suggestions.length}件の提案</span>
          <span>•</span>
          <span>優先度の高いものから実施してください</span>
        </div>
      </div>

      {/* 提案カード */}
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`bg-white rounded-xl border-2 ${getCardBorderColor(suggestion.impact)} shadow-lg hover:shadow-xl transition-all duration-200`}
          >
            {/* カードヘッダー */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getCategoryColor(suggestion.category)} text-white shadow-md`}>
                    {suggestion.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      {getImpactBadge(suggestion.impact)}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{suggestion.title}</h4>
                    <p className="text-gray-700 leading-relaxed">{suggestion.description}</p>
                  </div>
                </div>
              </div>

              {/* 期待効果 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-700">期待効果:</span>
                  <span className="text-lg font-bold text-green-600">{suggestion.estimatedIncrease}</span>
                </div>
              </div>

              {/* 展開ボタン */}
              <button
                onClick={() => setExpandedCard(expandedCard === suggestion.id ? null : suggestion.id)}
                className="mt-4 w-full flex items-center justify-center space-x-2 text-purple-600 hover:text-purple-700 font-semibold py-2 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <span>{expandedCard === suggestion.id ? '詳細を閉じる' : '詳細を見る'}</span>
                {expandedCard === suggestion.id ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* 展開コンテンツ */}
            {expandedCard === suggestion.id && (
              <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
                {/* ビジネスインサイト */}
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <h5 className="font-bold text-blue-900 mb-2 flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5" />
                    <span>ビジネスインサイト</span>
                  </h5>
                  <p className="text-blue-800 leading-relaxed">{suggestion.businessInsight}</p>
                </div>

                {/* アクションステップ */}
                <div>
                  <h5 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span>実行ステップ</span>
                  </h5>
                  <ol className="space-y-3">
                    {suggestion.actionSteps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {stepIndex + 1}
                        </span>
                        <span className="text-gray-700 leading-relaxed pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-amber-900 mb-2">💡 実装のポイント</h4>
            <ul className="text-amber-800 space-y-1 text-sm">
              <li>• 優先度の高いものから段階的に実装しましょう</li>
              <li>• 各施策の効果を測定し、データに基づいて改善を続けてください</li>
              <li>• 一度に多くを実装するより、1つずつ確実に効果を出すことが重要です</li>
              <li>• ファンの声を聞きながら、柔軟に調整していきましょう</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
