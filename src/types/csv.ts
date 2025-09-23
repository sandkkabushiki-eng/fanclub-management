export interface CSVData {
  [key: string]: string | number;
}

// ファンクラブ売上データの型定義
export interface FanClubRevenueData {
  日付?: string; // 購入日
  金額?: number; // 売上金額
  手数料?: number; // サイトの手数料
  種類?: 'プラン購入' | '単品販売'; // 購入タイプ
  対象?: string; // プラン名 or 作品名
  購入者?: string; // 購入者の名前
  顧客名?: string; // 顧客名（購入者と同じ）
  // 以下の項目は無視
  対象URL?: string;
  ユーザページURL?: string;
  プラン解約日?: string;
  // その他の動的プロパティ
  [key: string]: string | number | undefined;
}

// 売上分析結果の型定義
export interface RevenueAnalysis {
  totalRevenue: number;
  totalFees: number;
  totalTransactions: number;
  planPurchases: number;
  singlePurchases: number;
  topBuyers: {
    name: string;
    totalSpent: number;
    transactionCount: number;
    averageSpent: number;
  }[];
  topProducts: {
    name: string;
    revenue: number;
    salesCount: number;
    type: string;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
    fees: number;
    transactions: number;
  }[];
  averageTransactionValue: number;
  averageSpendingPerCustomer: number; // 購入者平均単価
  feeRate: number;
  totalCustomers: number;
  repeatRate: number;
}

// 経費管理の型定義
export interface ExpenseItem {
  id: string;
  date: string;
  category: 'venue' | 'equipment' | 'staff' | 'marketing' | 'transportation' | 'food' | 'utilities' | 'other';
  description: string;
  amount: number;
  vendor?: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'online';
  status: 'paid' | 'pending' | 'cancelled';
  receiptUrl?: string;
  notes?: string;
}

// 損益計算書の型定義
export interface ProfitLossStatement {
  period: string;
  revenue: {
    total: number;
    planPurchases: number;
    singlePurchases: number;
  };
  expenses: {
    total: number;
    venue: number;
    equipment: number;
    staff: number;
    marketing: number;
    transportation: number;
    food: number;
    utilities: number;
    other: number;
  };
  fees: {
    total: number;
    platformFees: number;
  };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

// 収益配分の型定義
export interface RevenueDistribution {
  buyerName: string;
  totalContribution: number;
  distributionPercentage: number;
  distributionAmount: number;
  transactionCount: number;
  averageTransactionValue: number;
}

// 財務ダッシュボードの型定義
export interface FinancialDashboard {
  currentMonth: ProfitLossStatement;
  yearToDate: ProfitLossStatement;
  monthlyTrend: {
    month: string;
    revenue: number;
    expenses: number;
    fees: number;
    profit: number;
  }[];
  topRevenueSources: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  revenueDistribution: RevenueDistribution[];
}

// 月別データ管理の型定義
export interface MonthlyData {
  id: string;
  year: number;
  month: number;
  data: FanClubRevenueData[];
  analysis: RevenueAnalysis;
  uploadedAt: string;
  lastModified: string;
}

export interface MonthlyDataSummary {
  year: number;
  month: number;
  totalRevenue: number;
  totalFees: number;
  totalTransactions: number;
  planPurchases: number;
  singlePurchases: number;
  uploadedAt: string;
}

// 担当者管理の型定義
export interface StaffMember {
  id: string;
  name: string;
  role: string; // モデル担当者、カメラマン、編集者など
  description?: string;
  createdAt: string;
}

// 経費管理の型定義
export interface ExpenseRecord {
  id: string;
  date: string;
  staffMemberId: string;
  staffMemberName: string;
  category: 'modeling' | 'photography' | 'editing' | 'equipment' | 'venue' | 'transportation' | 'other';
  description: string;
  amount: number;
  modelName?: string; // どのモデルに関連する経費か
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

// 収益配分の型定義
export interface RevenueDistribution {
  staffMemberId: string;
  staffMemberName: string;
  role: string;
  totalRevenue: number; // その担当者の売上貢献
  totalExpenses: number; // その担当者の経費
  netDistribution: number; // 実際の配分額（売上 - 経費）
  distributionPercentage: number; // 全体売上に対する割合
  modelContributions: {
    modelName: string;
    revenue: number;
    expenses: number;
    netAmount: number;
  }[];
}

// 月別収益配分の型定義
export interface MonthlyRevenueDistribution {
  year: number;
  month: number;
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  distributions: RevenueDistribution[];
}

// モデル管理の型定義
export interface Model {
  id: string;
  name: string;
  displayName: string; // 表示用の名前
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// モデル別月別売上データの型定義
export interface ModelMonthlyData {
  id: string;
  modelId: string;
  modelName: string;
  year: number;
  month: number;
  data: FanClubRevenueData[];
  analysis: RevenueAnalysis;
  uploadedAt: string;
  lastModified: string;
}

// モデル別売上サマリーの型定義
export interface ModelRevenueSummary {
  modelId: string;
  modelName: string;
  totalRevenue: number;
  totalFees: number;
  totalTransactions: number;
  planPurchases: number;
  singlePurchases: number;
  monthlyData: {
    year: number;
    month: number;
    revenue: number;
    fees: number;
    transactions: number;
  }[];
  lastActivity: string;
}

// リピーター分析の型定義
export interface RepeatCustomer {
  buyerName: string;
  totalTransactions: number;
  totalSpent: number;
  averageTransactionValue: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  purchaseFrequency: number; // 月平均購入回数
  models: {
    modelName: string;
    transactions: number;
    totalSpent: number;
  }[];
  monthlySpending: {
    year: number;
    month: number;
    amount: number;
    transactions: number;
  }[];
}

// 購入者分析の型定義
export interface CustomerAnalysis {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number; // リピート率
  averageSpendingPerCustomer: number;
  topSpenders: {
    name: string;
    totalSpent: number;
    purchaseCount: number;
    averageSpent: number;
  }[];
  allRepeaters: {
    name: string;
    totalSpent: number;
    purchaseCount: number;
    averageSpent: number;
  }[];
}
