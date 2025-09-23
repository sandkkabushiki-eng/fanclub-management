import { FanClubRevenueData, CustomerAnalysis } from '@/types/csv';
import { getModelMonthlyData } from './modelUtils';

// 顧客データを分析
export const analyzeCustomerData = (data: FanClubRevenueData[]): CustomerAnalysis => {
  if (data.length === 0) {
    return {
      totalCustomers: 0,
      repeatCustomers: 0,
      repeatRate: 0,
      averageSpendingPerCustomer: 0,
      topSpenders: [],
      allRepeaters: []
    };
  }

  // 顧客ごとの購入データを集計
  const customerData = new Map<string, {
    name: string;
    totalSpent: number;
    purchaseCount: number;
    purchases: FanClubRevenueData[];
  }>();

  data.forEach(record => {
    const customerName = record.顧客名 || '不明';
    const amount = record.金額 || 0;
    
    if (!customerData.has(customerName)) {
      customerData.set(customerName, {
        name: customerName,
        totalSpent: 0,
        purchaseCount: 0,
        purchases: []
      });
    }
    
    const customer = customerData.get(customerName)!;
    customer.totalSpent += amount;
    customer.purchaseCount += 1;
    customer.purchases.push(record);
  });

  const customers = Array.from(customerData.values());
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter(c => c.purchaseCount > 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const averageSpendingPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // トップスぺンダー（購入金額順）
  const topSpenders = customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(customer => ({
      name: customer.name,
      totalSpent: customer.totalSpent,
      purchaseCount: customer.purchaseCount,
      averageSpent: customer.totalSpent / customer.purchaseCount
    }));

  // 全リピーター（2回以上購入）
  const allRepeaters = customers
    .filter(c => c.purchaseCount > 1)
    .map(customer => ({
      name: customer.name,
      totalSpent: customer.totalSpent,
      purchaseCount: customer.purchaseCount,
      averageSpent: customer.totalSpent / customer.purchaseCount
    }));

  return {
    totalCustomers,
    repeatCustomers,
    repeatRate,
    averageSpendingPerCustomer,
    topSpenders,
    allRepeaters
  };
};

// リピーター分析
export const analyzeRepeatCustomers = (data: FanClubRevenueData[]): CustomerAnalysis => {
  return analyzeCustomerData(data);
};

// モデル別の顧客分析
export const getModelCustomerAnalysis = (modelId: string): CustomerAnalysis => {
  const modelData = getModelMonthlyData().filter(data => data.modelId === modelId);
  const allData = modelData.flatMap(data => data.data);
  return analyzeCustomerData(allData);
};
