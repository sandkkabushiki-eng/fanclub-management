import Papa from 'papaparse';
import { CSVData, FanClubRevenueData, RevenueAnalysis, CustomerAnalysis, RepeatCustomer } from '@/types/csv';

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
      totalTransactions: 0,
      planPurchases: 0,
      singlePurchases: 0,
      topBuyers: [],
      topProducts: [],
      monthlyRevenue: [],
      averageTransactionValue: 0,
      averageSpendingPerCustomer: 0,
      feeRate: 0,
      totalCustomers: 0,
      repeatRate: 0
    };
  }

  // 売上と手数料
  // 売上 = 購入者が支払った金額（手数料込み）
  const totalRevenue = data.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
  // 手数料 = プラットフォームが取る手数料
  const totalFees = data.reduce((sum, item) => sum + (Number(item.手数料) || 0), 0);
  // 純利益 = 売上 - 手数料（実際の収益）
  // const netRevenue = totalRevenue - totalFees;

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
  
  // リピート率を計算
  const customerPurchaseCounts = new Map<string, number>();
  data.forEach(item => {
    const customer = item.購入者 || '不明';
    customerPurchaseCounts.set(customer, (customerPurchaseCounts.get(customer) || 0) + 1);
  });
  const repeatCustomers = Array.from(customerPurchaseCounts.values()).filter(count => count > 1).length;
  const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

  return {
    totalRevenue,
    totalFees,
    totalTransactions: data.length,
    planPurchases,
    singlePurchases,
    topBuyers,
    topProducts,
    monthlyRevenue: monthlyRevenueArray,
    averageTransactionValue,
    averageSpendingPerCustomer,
    feeRate,
    totalCustomers: uniqueCustomers,
    repeatRate
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
};

// 顧客データを分析
export const analyzeCustomerData = (data: FanClubRevenueData[]): CustomerAnalysis => {
  if (data.length === 0) {
    return {
      totalCustomers: 0,
      repeatCustomers: 0,
      newCustomers: 0,
      repeatRate: 0,
      averageSpendingPerCustomer: 0,
      topSpenders: [],
      recentCustomers: [],
      allRepeaters: [],
      customerSegments: [],
      monthlyCustomerTrends: [],
      customerLifetimeValue: []
    };
  }

  // 顧客ごとの購入データを集計
  const customerData = new Map<string, {
    name: string;
    totalSpent: number;
    purchaseCount: number;
    purchases: FanClubRevenueData[];
    firstPurchaseDate: string;
    lastPurchaseDate: string;
  }>();

  data.forEach(record => {
    const customerName = record.顧客名 || record.購入者 || '不明';
    const amount = record.金額 || 0;
    const purchaseDate = record.日付 || new Date().toISOString();
    
    if (!customerData.has(customerName)) {
      customerData.set(customerName, {
        name: customerName,
        totalSpent: 0,
        purchaseCount: 0,
        purchases: [],
        firstPurchaseDate: purchaseDate,
        lastPurchaseDate: purchaseDate
      });
    }
    
    const customer = customerData.get(customerName)!;
    customer.totalSpent += amount;
    customer.purchaseCount += 1;
    customer.purchases.push(record);
    
    // 最初と最後の購入日を更新
    if (purchaseDate < customer.firstPurchaseDate) {
      customer.firstPurchaseDate = purchaseDate;
    }
    if (purchaseDate > customer.lastPurchaseDate) {
      customer.lastPurchaseDate = purchaseDate;
    }
  });

  const customers = Array.from(customerData.values());
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter(c => c.purchaseCount > 1).length;
  const newCustomers = customers.filter(c => c.purchaseCount === 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const averageSpendingPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // トップスぺンダー（購入金額順）
  const topSpenders: RepeatCustomer[] = customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(customer => ({
      buyerName: customer.name,
      totalTransactions: customer.purchaseCount,
      totalSpent: customer.totalSpent,
      averageTransactionValue: customer.totalSpent / customer.purchaseCount,
      firstPurchaseDate: customer.firstPurchaseDate,
      lastPurchaseDate: customer.lastPurchaseDate,
      purchaseFrequency: customer.purchaseCount / Math.max(1, Math.ceil((new Date(customer.lastPurchaseDate).getTime() - new Date(customer.firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))),
      models: [],
      monthlySpending: []
    }));

  // 最近の顧客（最後の購入日順）
  const recentCustomers: RepeatCustomer[] = customers
    .sort((a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime())
    .slice(0, 10)
    .map(customer => ({
      buyerName: customer.name,
      totalTransactions: customer.purchaseCount,
      totalSpent: customer.totalSpent,
      averageTransactionValue: customer.totalSpent / customer.purchaseCount,
      firstPurchaseDate: customer.firstPurchaseDate,
      lastPurchaseDate: customer.lastPurchaseDate,
      purchaseFrequency: customer.purchaseCount / Math.max(1, Math.ceil((new Date(customer.lastPurchaseDate).getTime() - new Date(customer.firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))),
      models: [],
      monthlySpending: []
    }));

  // 全リピーター（2回以上購入）
  const allRepeaters: RepeatCustomer[] = customers
    .filter(c => c.purchaseCount > 1)
    .map(customer => ({
      buyerName: customer.name,
      totalTransactions: customer.purchaseCount,
      totalSpent: customer.totalSpent,
      averageTransactionValue: customer.totalSpent / customer.purchaseCount,
      firstPurchaseDate: customer.firstPurchaseDate,
      lastPurchaseDate: customer.lastPurchaseDate,
      purchaseFrequency: customer.purchaseCount / Math.max(1, Math.ceil((new Date(customer.lastPurchaseDate).getTime() - new Date(customer.firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))),
      models: [],
      monthlySpending: []
    }));

  // 顧客セグメント分析
  const sortedCustomers = customers.sort((a, b) => b.totalSpent - a.totalSpent);
  const highValueThreshold = sortedCustomers[Math.floor(sortedCustomers.length * 0.2)]?.totalSpent || 0;
  const mediumValueThreshold = sortedCustomers[Math.floor(sortedCustomers.length * 0.6)]?.totalSpent || 0;

  const customerSegments = [
    {
      segment: 'high_value' as const,
      count: customers.filter(c => c.totalSpent >= highValueThreshold).length,
      totalSpent: customers.filter(c => c.totalSpent >= highValueThreshold).reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: customers.filter(c => c.totalSpent >= highValueThreshold).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(1, customers.filter(c => c.totalSpent >= highValueThreshold).length)
    },
    {
      segment: 'medium_value' as const,
      count: customers.filter(c => c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold).length,
      totalSpent: customers.filter(c => c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold).reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: customers.filter(c => c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(1, customers.filter(c => c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold).length)
    },
    {
      segment: 'low_value' as const,
      count: customers.filter(c => c.totalSpent < mediumValueThreshold && c.purchaseCount > 1).length,
      totalSpent: customers.filter(c => c.totalSpent < mediumValueThreshold && c.purchaseCount > 1).reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: customers.filter(c => c.totalSpent < mediumValueThreshold && c.purchaseCount > 1).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(1, customers.filter(c => c.totalSpent < mediumValueThreshold && c.purchaseCount > 1).length)
    },
    {
      segment: 'new' as const,
      count: newCustomers,
      totalSpent: customers.filter(c => c.purchaseCount === 1).reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: customers.filter(c => c.purchaseCount === 1).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(1, newCustomers)
    }
  ];

  // 月別顧客トレンド
  const monthlyTrends = new Map<string, { newCustomers: number; returningCustomers: number; totalRevenue: number }>();
  
  data.forEach(record => {
    const date = new Date(record.日付 || new Date().toISOString());
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyTrends.has(monthKey)) {
      monthlyTrends.set(monthKey, { newCustomers: 0, returningCustomers: 0, totalRevenue: 0 });
    }
    
    const trend = monthlyTrends.get(monthKey)!;
    trend.totalRevenue += record.金額 || 0;
    
    // 新規顧客かリピーターかを判定
    const customerName = record.顧客名 || record.購入者 || '不明';
    const customer = customerData.get(customerName);
    if (customer && customer.firstPurchaseDate === record.日付) {
      trend.newCustomers++;
    } else {
      trend.returningCustomers++;
    }
  });

  const monthlyCustomerTrends = Array.from(monthlyTrends.entries())
    .map(([month, data]) => ({
      month,
      ...data
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 顧客生涯価値
  const customerLifetimeValue = customers.map(customer => {
    const daysActive = Math.ceil((new Date(customer.lastPurchaseDate).getTime() - new Date(customer.firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      customerName: customer.name,
      totalSpent: customer.totalSpent,
      purchaseCount: customer.purchaseCount,
      averageSpent: customer.totalSpent / customer.purchaseCount,
      firstPurchaseDate: customer.firstPurchaseDate,
      lastPurchaseDate: customer.lastPurchaseDate,
      daysActive
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    totalCustomers,
    repeatCustomers,
    newCustomers,
    repeatRate,
    averageSpendingPerCustomer,
    topSpenders,
    recentCustomers,
    allRepeaters,
    customerSegments,
    monthlyCustomerTrends,
    customerLifetimeValue
  };
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
