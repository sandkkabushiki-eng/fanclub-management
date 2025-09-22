import { FanClubRevenueData, RepeatCustomer, CustomerAnalysis } from '@/types/csv';
import { getModelMonthlyData } from './modelUtils';

// リピーター分析を実行
export const analyzeRepeatCustomers = (modelId?: string): CustomerAnalysis => {
  const allData = getModelMonthlyData();
  let data: FanClubRevenueData[] = [];
  
  if (modelId) {
    // 特定のモデルのデータのみ
    const modelData = allData.filter(d => d.modelId === modelId);
    data = modelData.flatMap(d => d.data);
  } else {
    // 全モデルのデータ
    data = allData.flatMap(d => d.data);
  }
  
  if (data.length === 0) {
    return {
      totalCustomers: 0,
      repeatCustomers: 0,
      newCustomers: 0,
      repeatRate: 0,
      averageSpendingPerCustomer: 0,
      topSpenders: [],
      recentCustomers: [],
      customerSegments: []
    };
  }
  
  // 購入者別のデータを集計
  const customerData = new Map<string, {
    transactions: FanClubRevenueData[];
    totalSpent: number;
    firstPurchase: string;
    lastPurchase: string;
  }>();
  
  data.forEach(transaction => {
    const buyerName = transaction.購入者 || '不明';
    const amount = Number(transaction.金額) || 0;
    const date = transaction.日付 || '';
    
    if (!customerData.has(buyerName)) {
      customerData.set(buyerName, {
        transactions: [],
        totalSpent: 0,
        firstPurchase: date,
        lastPurchase: date
      });
    }
    
    const customer = customerData.get(buyerName)!;
    customer.transactions.push(transaction);
    customer.totalSpent += amount;
    
    if (date < customer.firstPurchase) {
      customer.firstPurchase = date;
    }
    if (date > customer.lastPurchase) {
      customer.lastPurchase = date;
    }
  });
  
  // リピーター情報を構築
  const repeatCustomers: RepeatCustomer[] = Array.from(customerData.entries())
    .map(([buyerName, data]) => {
      const transactionCount = data.transactions.length;
      const averageTransactionValue = data.totalSpent / transactionCount;
      
      // 購入頻度を計算（月平均）
      const firstDate = new Date(data.firstPurchase);
      const lastDate = new Date(data.lastPurchase);
      const monthsDiff = Math.max(1, (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
        (lastDate.getMonth() - firstDate.getMonth()) + 1);
      const purchaseFrequency = transactionCount / monthsDiff;
      
      // モデル別の購入データ
      const modelData = new Map<string, { transactions: number; totalSpent: number }>();
      data.transactions.forEach(transaction => {
        // モデル名を取得（簡易版：対象から推測）
        const modelName = transaction.対象 || '不明';
        if (!modelData.has(modelName)) {
          modelData.set(modelName, { transactions: 0, totalSpent: 0 });
        }
        const model = modelData.get(modelName)!;
        model.transactions++;
        model.totalSpent += Number(transaction.金額) || 0;
      });
      
      // 月別支出データ
      const monthlyData = new Map<string, { amount: number; transactions: number }>();
      data.transactions.forEach(transaction => {
        const date = new Date(transaction.日付 || '');
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { amount: 0, transactions: 0 });
        }
        const month = monthlyData.get(monthKey)!;
        month.amount += Number(transaction.金額) || 0;
        month.transactions++;
      });
      
      return {
        buyerName,
        totalTransactions: transactionCount,
        totalSpent: data.totalSpent,
        averageTransactionValue,
        firstPurchaseDate: data.firstPurchase,
        lastPurchaseDate: data.lastPurchase,
        purchaseFrequency,
        models: Array.from(modelData.entries()).map(([modelName, data]) => ({
          modelName,
          transactions: data.transactions,
          totalSpent: data.totalSpent
        })),
        monthlySpending: Array.from(monthlyData.entries()).map(([monthKey, data]) => {
          const [year, month] = monthKey.split('-').map(Number);
          return {
            year,
            month,
            amount: data.amount,
            transactions: data.transactions
          };
        }).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
  
  const totalCustomers = repeatCustomers.length;
  const repeatCustomersCount = repeatCustomers.filter(c => c.totalTransactions > 1).length;
  const newCustomers = repeatCustomers.filter(c => c.totalTransactions === 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomersCount / totalCustomers) * 100 : 0;
  const averageSpendingPerCustomer = totalCustomers > 0 ? 
    repeatCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers : 0;
  
  // 顧客セグメント分析
  const totalSpent = repeatCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
  const highValueThreshold = totalSpent * 0.2; // 上位20%
  const mediumValueThreshold = totalSpent * 0.5; // 上位50%
  
  const customerSegments = [
    {
      segment: 'high_value' as const,
      customers: repeatCustomers.filter(c => c.totalSpent >= highValueThreshold),
      label: '高価値顧客'
    },
    {
      segment: 'medium_value' as const,
      customers: repeatCustomers.filter(c => 
        c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold
      ),
      label: '中価値顧客'
    },
    {
      segment: 'low_value' as const,
      customers: repeatCustomers.filter(c => 
        c.totalSpent < mediumValueThreshold && c.totalTransactions > 1
      ),
      label: '低価値顧客'
    },
    {
      segment: 'new' as const,
      customers: repeatCustomers.filter(c => c.totalTransactions === 1),
      label: '新規顧客'
    }
  ].map(segment => ({
    segment: segment.segment,
    count: segment.customers.length,
    totalSpent: segment.customers.reduce((sum, c) => sum + c.totalSpent, 0),
    averageSpent: segment.customers.length > 0 ? 
      segment.customers.reduce((sum, c) => sum + c.totalSpent, 0) / segment.customers.length : 0
  }));
  
  return {
    totalCustomers,
    repeatCustomers: repeatCustomersCount,
    newCustomers,
    repeatRate,
    averageSpendingPerCustomer,
    topSpenders: repeatCustomers.slice(0, 10),
    recentCustomers: repeatCustomers
      .sort((a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime())
      .slice(0, 10),
    customerSegments
  };
};

// モデル別の月別売上分析
export const getModelMonthlyAnalysis = (modelId: string) => {
  const allData = getModelMonthlyData();
  const modelData = allData.filter(d => d.modelId === modelId);
  
  return modelData.map(data => ({
    year: data.year,
    month: data.month,
    revenue: data.analysis.totalRevenue,
    fees: data.analysis.totalFees,
    transactions: data.analysis.totalTransactions,
    planPurchases: data.analysis.planPurchases,
    singlePurchases: data.analysis.singlePurchases,
    topBuyers: data.analysis.topBuyers.slice(0, 5),
    topProducts: data.analysis.topProducts.slice(0, 5)
  })).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};
