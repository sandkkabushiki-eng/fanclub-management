// サブスクリプションプラン定義
export type PlanType = 'free' | 'pro';

export interface PlanFeatures {
  maxModels: number;           // モデル登録上限
  dataRetentionMonths: number; // データ保存期間（月）
  basicAnalytics: boolean;     // 基本分析
  advancedAnalytics: boolean;  // 詳細分析
  aiSuggestions: boolean;      // AI提案
  csvExport: boolean;          // CSVエクスポート
  prioritySupport: boolean;    // 優先サポート
}

export interface Plan {
  id: PlanType;
  name: string;
  price: number;           // 月額（円）
  yearlyPrice?: number;    // 年額（円）
  features: PlanFeatures;
  description: string;
  popular?: boolean;
}

// プラン定義
export const SUBSCRIPTION_PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: '無料プラン',
    price: 0,
    features: {
      maxModels: 1,
      dataRetentionMonths: 2,
      basicAnalytics: true,
      advancedAnalytics: false,
      aiSuggestions: false,
      csvExport: false,
      prioritySupport: false,
    },
    description: '個人で始める方におすすめ',
  },
  pro: {
    id: 'pro',
    name: 'プロプラン',
    price: 2980,
    yearlyPrice: 29800, // 年額で約17%お得
    features: {
      maxModels: Infinity,
      dataRetentionMonths: Infinity,
      basicAnalytics: true,
      advancedAnalytics: true,
      aiSuggestions: true,
      csvExport: true,
      prioritySupport: true,
    },
    description: '本格的に運用したい方におすすめ',
    popular: true,
  },
};

// ユーザーのサブスクリプション状態
export interface UserSubscription {
  planType: PlanType;
  status: 'active' | 'canceled' | 'expired' | 'trialing';
  currentPeriodEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

// プラン制限チェック用のヘルパー関数
export function canAddModel(currentModelCount: number, planType: PlanType): boolean {
  const plan = SUBSCRIPTION_PLANS[planType];
  return currentModelCount < plan.features.maxModels;
}

export function canAccessAdvancedAnalytics(planType: PlanType): boolean {
  return SUBSCRIPTION_PLANS[planType].features.advancedAnalytics;
}

export function canAccessAISuggestions(planType: PlanType): boolean {
  return SUBSCRIPTION_PLANS[planType].features.aiSuggestions;
}

export function getDataRetentionMonths(planType: PlanType): number {
  return SUBSCRIPTION_PLANS[planType].features.dataRetentionMonths;
}

export function getRemainingModels(currentModelCount: number, planType: PlanType): number {
  const maxModels = SUBSCRIPTION_PLANS[planType].features.maxModels;
  if (maxModels === Infinity) return Infinity;
  return Math.max(0, maxModels - currentModelCount);
}

// 機能一覧（表示用）
export const FEATURE_LIST = [
  { key: 'maxModels', label: 'モデル登録', freeValue: '1人まで', proValue: '無制限' },
  { key: 'dataRetentionMonths', label: 'データ保存', freeValue: '2ヶ月', proValue: '無制限' },
  { key: 'basicAnalytics', label: '基本分析', freeValue: true, proValue: true },
  { key: 'advancedAnalytics', label: '詳細分析', freeValue: false, proValue: true },
  { key: 'aiSuggestions', label: 'AI提案機能', freeValue: false, proValue: true },
  { key: 'csvExport', label: 'CSVエクスポート', freeValue: false, proValue: true },
  { key: 'prioritySupport', label: '優先サポート', freeValue: false, proValue: true },
] as const;

