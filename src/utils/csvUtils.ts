import Papa from 'papaparse';
import { CSVData, FanClubRevenueData, RevenueAnalysis } from '@/types/csv';

export const parseCSV = (csvText: string): Promise<CSVData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV解析エラー: ${results.errors[0].message}`));
        } else {
          resolve(results.data as CSVData[]);
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

export const parseCSVFile = (file: File): Promise<CSVData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV解析エラー: ${results.errors[0].message}`));
        } else {
          resolve(results.data as CSVData[]);
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

// ファンクラブ売上データの分析
export const analyzeFanClubRevenue = (data: FanClubRevenueData[]): RevenueAnalysis => {
  if (data.length === 0) {
    return {
      totalRevenue: 0,
      totalFees: 0,
      netRevenue: 0,
      totalTransactions: 0,
      planPurchases: 0,
      singlePurchases: 0,
      topBuyers: [],
      topProducts: [],
      monthlyRevenue: [],
      averageTransactionValue: 0,
      averageSpendingPerCustomer: 0,
      feeRate: 0
    };
  }

  // 売上と手数料
  // 売上 = 購入者が支払った金額（手数料込み）
  const totalRevenue = data.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
  // 手数料 = プラットフォームが取る手数料
  const totalFees = data.reduce((sum, item) => sum + (Number(item.手数料) || 0), 0);
  // 純利益 = 売上 - 手数料（実際の収益）
  const netRevenue = totalRevenue - totalFees;

  // 購入タイプ別集計
  const planPurchases = data.filter(item => item.種類 === 'プラン購入').length;
  const singlePurchases = data.filter(item => item.種類 === '単品販売').length;

  // トップ購入者
  const buyerStats = data.reduce((acc, item) => {
    const buyer = item.購入者 || '不明';
    if (!acc[buyer]) {
      acc[buyer] = { name: buyer, totalSpent: 0, transactionCount: 0 };
    }
    acc[buyer].totalSpent += Number(item.金額) || 0;
    acc[buyer].transactionCount += 1;
    return acc;
  }, {} as Record<string, { name: string; totalSpent: number; transactionCount: number }>);

  const topBuyers = Object.values(buyerStats)
    .map(buyer => ({
      ...buyer,
      averageSpent: buyer.totalSpent / buyer.transactionCount
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // トップ商品・プラン
  const productStats = data.reduce((acc, item) => {
    const product = item.対象 || '不明';
    if (!acc[product]) {
      acc[product] = { name: product, revenue: 0, salesCount: 0, type: item.種類 || '不明' };
    }
    acc[product].revenue += Number(item.金額) || 0;
    acc[product].salesCount += 1;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; salesCount: number; type: string }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // 月次売上
  const monthlyRevenue = data.reduce((acc, item) => {
    if (!item.日付) return acc;
    const date = new Date(item.日付);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, revenue: 0, fees: 0, transactions: 0 };
    }
    acc[monthKey].revenue += Number(item.金額) || 0;
    acc[monthKey].fees += Number(item.手数料) || 0;
    acc[monthKey].transactions += 1;
    return acc;
  }, {} as Record<string, { month: string; revenue: number; fees: number; transactions: number }>);

  const monthlyRevenueArray = Object.values(monthlyRevenue)
    .sort((a, b) => a.month.localeCompare(b.month));

  const averageTransactionValue = data.length > 0 ? totalRevenue / data.length : 0;
  const feeRate = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0;
  
  // 購入者平均単価を計算
  const uniqueCustomers = new Set(data.map(item => item.購入者 || '不明')).size;
  const averageSpendingPerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

  return {
    totalRevenue,
    totalFees,
    netRevenue,
    totalTransactions: data.length,
    planPurchases,
    singlePurchases,
    topBuyers,
    topProducts,
    monthlyRevenue: monthlyRevenueArray,
    averageTransactionValue,
    averageSpendingPerCustomer,
    feeRate
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
