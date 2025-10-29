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
          // 日付フォーマットを正規化
          const normalizedData = (results.data as CSVData[]).map(row => {
            if (row.日付) {
              const dateStr = String(row.日付);
              
              // 日付フォーマットを解析して正規化
              let normalizedDate = '';
              
              // パターン1: "10月21日 14:41:21" 形式
              const match1 = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
              if (match1) {
                const month = parseInt(match1[1]);
                const day = parseInt(match1[2]);
                const hour = parseInt(match1[3]);
                const minute = parseInt(match1[4]);
                const second = parseInt(match1[5]);
                
                // 年を推定（現在の年を使用、ただし月が未来の場合は前年）
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                
                let year = currentYear;
                if (month > currentMonth) {
                  year = currentYear - 1;
                }
                
                const date = new Date(year, month - 1, day, hour, minute, second);
                normalizedDate = date.toISOString();
              }
              // パターン2: 標準的な日付形式
              else {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  normalizedDate = date.toISOString();
                }
              }
              
              if (normalizedDate) {
                row.日付 = normalizedDate;
              } else {
                console.warn('無効な日付フォーマット:', dateStr);
              }
            }
            return row;
          });
          resolve(normalizedData);
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
          // 日付フォーマットを正規化
          const normalizedData = (results.data as CSVData[]).map(row => {
            if (row.日付) {
              const dateStr = String(row.日付);
              
              // 日付フォーマットを解析して正規化
              let normalizedDate = '';
              
              // パターン1: "10月21日 14:41:21" 形式
              const match1 = dateStr.match(/(\d+)月(\d+)日\s+(\d+):(\d+):(\d+)/);
              if (match1) {
                const month = parseInt(match1[1]);
                const day = parseInt(match1[2]);
                const hour = parseInt(match1[3]);
                const minute = parseInt(match1[4]);
                const second = parseInt(match1[5]);
                
                // 年を推定（現在の年を使用、ただし月が未来の場合は前年）
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                
                let year = currentYear;
                if (month > currentMonth) {
                  year = currentYear - 1;
                }
                
                const date = new Date(year, month - 1, day, hour, minute, second);
                normalizedDate = date.toISOString();
              }
              // パターン2: 標準的な日付形式
              else {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  normalizedDate = date.toISOString();
                }
              }
              
              if (normalizedDate) {
                row.日付 = normalizedDate;
              } else {
                console.warn('無効な日付フォーマット:', dateStr);
              }
            }
            return row;
          });
          resolve(normalizedData);
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
  // データが配列でない場合は空の結果を返す
  if (!Array.isArray(data) || data.length === 0) {
    return {
      totalRevenue: 0,
      totalFees: 0,
      totalTransactions: 0,
      planPurchases: 0,
      singlePurchases: 0,
      topBuyers: [],
      topProducts: [],
      planDetails: [],
      singleItemDetails: [],
      monthlyPlanDetails: [],
      monthlySingleItemDetails: [],
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

  // プラン詳細分析
  const planStats = data
    .filter(item => item.種類 === 'プラン購入')
    .reduce((acc, item) => {
      const planName = item.対象 || '不明なプラン';
      if (!acc[planName]) {
        acc[planName] = { planName, salesCount: 0, totalRevenue: 0 };
      }
      acc[planName].salesCount += 1;
      acc[planName].totalRevenue += Number(item.金額) || 0;
      return acc;
    }, {} as Record<string, { planName: string; salesCount: number; totalRevenue: number }>);

  const planDetails = Object.values(planStats)
    .map(plan => ({
      ...plan,
      averagePrice: plan.totalRevenue / plan.salesCount
    }))
    .sort((a, b) => b.salesCount - a.salesCount);

  // 単品詳細分析
  const singleItemStats = data
    .filter(item => item.種類 === '単品販売')
    .reduce((acc, item) => {
      const itemName = item.対象 || '不明な商品';
      if (!acc[itemName]) {
        acc[itemName] = { itemName, salesCount: 0, totalRevenue: 0 };
      }
      acc[itemName].salesCount += 1;
      acc[itemName].totalRevenue += Number(item.金額) || 0;
      return acc;
    }, {} as Record<string, { itemName: string; salesCount: number; totalRevenue: number }>);

  const singleItemDetails = Object.values(singleItemStats)
    .map(item => ({
      ...item,
      averagePrice: item.totalRevenue / item.salesCount
    }))
    .sort((a, b) => b.salesCount - a.salesCount);

  // 月別プラン詳細分析
  const monthlyPlanStats = new Map<string, Map<string, { salesCount: number; totalRevenue: number }>>();
  data
    .filter(item => item.種類 === 'プラン購入')
    .forEach(item => {
      if (!item.日付) return;
      const date = new Date(item.日付);
      // 無効な日付の場合はスキップ
      if (isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const planName = item.対象 || '不明なプラン';
      
      if (!monthlyPlanStats.has(monthKey)) {
        monthlyPlanStats.set(monthKey, new Map());
      }
      
      const monthPlans = monthlyPlanStats.get(monthKey)!;
      if (!monthPlans.has(planName)) {
        monthPlans.set(planName, { salesCount: 0, totalRevenue: 0 });
      }
      
      const plan = monthPlans.get(planName)!;
      plan.salesCount += 1;
      plan.totalRevenue += Number(item.金額) || 0;
    });

  const monthlyPlanDetails = Array.from(monthlyPlanStats.entries())
    .map(([month, plans]) => {
      const plansArray = Array.from(plans.entries())
        .map(([planName, stats]) => ({
          planName,
          ...stats
        }))
        .sort((a, b) => b.salesCount - a.salesCount);
      
      const totalRevenue = plansArray.reduce((sum, plan) => sum + plan.totalRevenue, 0);
      
      return {
        month,
        totalRevenue,
        plans: plansArray
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));


  // 月別単品詳細分析
  const monthlySingleItemStats = new Map<string, Map<string, { salesCount: number; totalRevenue: number }>>();
  data
    .filter(item => item.種類 === '単品販売')
    .forEach(item => {
      if (!item.日付) return;
      const date = new Date(item.日付);
      // 無効な日付の場合はスキップ
      if (isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const itemName = item.対象 || '不明な商品';
      
      if (!monthlySingleItemStats.has(monthKey)) {
        monthlySingleItemStats.set(monthKey, new Map());
      }
      
      const monthItems = monthlySingleItemStats.get(monthKey)!;
      if (!monthItems.has(itemName)) {
        monthItems.set(itemName, { salesCount: 0, totalRevenue: 0 });
      }
      
      const singleItem = monthItems.get(itemName)!;
      singleItem.salesCount += 1;
      singleItem.totalRevenue += Number(item.金額) || 0;
    });

  const monthlySingleItemDetails = Array.from(monthlySingleItemStats.entries())
    .map(([month, items]) => {
      const itemsArray = Array.from(items.entries())
        .map(([itemName, stats]) => ({
          itemName,
          ...stats
        }))
        .sort((a, b) => b.salesCount - a.salesCount);
      
      const totalRevenue = itemsArray.reduce((sum, item) => sum + item.totalRevenue, 0);
      
      return {
        month,
        totalRevenue,
        items: itemsArray
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));


  // 月次売上
  const monthlyRevenue = data.reduce((acc, item) => {
    if (!item.日付) return acc;
    const date = new Date(item.日付);
    // 無効な日付の場合はスキップ
    if (isNaN(date.getTime())) return acc;
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
    planDetails,
    singleItemDetails,
    monthlyPlanDetails,
    monthlySingleItemDetails,
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

// 購入頻度を計算する関数
export const calculatePurchaseFrequency = (
  firstPurchaseDate: string, 
  lastPurchaseDate: string, 
  purchaseCount: number
): number => {
  if (purchaseCount <= 1) return 0;
  
  const firstDate = new Date(firstPurchaseDate);
  const lastDate = new Date(lastPurchaseDate);
  
  // 日数の差を計算
  const timeDiff = lastDate.getTime() - firstDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // 最低1日として計算（同じ日の購入でも1日として扱う）
  const actualDays = Math.max(1, daysDiff);
  
  // 月数に変換（30日 = 1ヶ月）
  const months = actualDays / 30;
  
  // 購入頻度 = 購入回数 / 月数
  return purchaseCount / Math.max(1, months);
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
    // 顧客名の取得（購入者フィールドを優先）
    const customerName = record.購入者 || record.顧客名 || '不明';
    // 金額の取得（数値型に変換）
    const amount = typeof record.金額 === 'number' ? record.金額 : Number(record.金額) || 0;
    const purchaseDate = record.日付 || new Date().toISOString();
    
    // デバッグ用ログ（本番では削除）
    // console.log('Processing record:', {
    //   customerName,
    //   amount,
    //   originalAmount: record.金額,
    //   purchaseDate
    // });
    
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
      purchaseFrequency: calculatePurchaseFrequency(customer.firstPurchaseDate, customer.lastPurchaseDate, customer.purchaseCount),
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
      purchaseFrequency: calculatePurchaseFrequency(customer.firstPurchaseDate, customer.lastPurchaseDate, customer.purchaseCount),
      models: [],
      monthlySpending: []
    }));

  // 全リピーター（2回以上購入）- 詳細情報付き
  const allRepeaters: RepeatCustomer[] = customers
    .filter(c => c.purchaseCount > 1)
    .map(customer => {
      // 月別支出を集計
      const monthlySpendingMap = new Map<string, { year: number; month: number; amount: number; transactions: number }>();
      customer.purchases.forEach(purchase => {
        const date = new Date(purchase.日付 || new Date().toISOString());
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!monthlySpendingMap.has(monthKey)) {
          monthlySpendingMap.set(monthKey, { year, month, amount: 0, transactions: 0 });
        }
        
        const monthData = monthlySpendingMap.get(monthKey)!;
        const amount = typeof purchase.金額 === 'number' ? purchase.金額 : Number(purchase.金額) || 0;
        monthData.amount += amount;
        monthData.transactions += 1;
      });
      
      const monthlySpending = Array.from(monthlySpendingMap.values())
        .sort((a, b) => a.year - b.year || a.month - b.month);
      
      return {
        buyerName: customer.name,
        totalTransactions: customer.purchaseCount,
        totalSpent: customer.totalSpent,
        averageTransactionValue: customer.totalSpent / customer.purchaseCount,
        firstPurchaseDate: customer.firstPurchaseDate,
        lastPurchaseDate: customer.lastPurchaseDate,
        purchaseFrequency: calculatePurchaseFrequency(customer.firstPurchaseDate, customer.lastPurchaseDate, customer.purchaseCount),
        models: [], // モデル別データ（将来の拡張用）
        monthlySpending
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // 顧客セグメント分析（修正版）
  const sortedCustomers = customers.sort((a, b) => b.totalSpent - a.totalSpent);
  
  // セグメント閾値の計算を修正
  const highValueThreshold = sortedCustomers.length > 0 ? sortedCustomers[Math.floor(sortedCustomers.length * 0.2)]?.totalSpent || 0 : 0;
  const mediumValueThreshold = sortedCustomers.length > 0 ? sortedCustomers[Math.floor(sortedCustomers.length * 0.6)]?.totalSpent || 0 : 0;

  // 各セグメントの顧客を取得
  const highValueCustomers = customers.filter(c => c.totalSpent >= highValueThreshold);
  const mediumValueCustomers = customers.filter(c => c.totalSpent >= mediumValueThreshold && c.totalSpent < highValueThreshold);
  const lowValueCustomers = customers.filter(c => c.totalSpent < mediumValueThreshold && c.purchaseCount > 1);
  const newCustomersList = customers.filter(c => c.purchaseCount === 1);

  const customerSegments = [
    {
      segment: 'high_value' as const,
      count: highValueCustomers.length,
      totalSpent: highValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: highValueCustomers.length > 0 ? highValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / highValueCustomers.length : 0
    },
    {
      segment: 'medium_value' as const,
      count: mediumValueCustomers.length,
      totalSpent: mediumValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: mediumValueCustomers.length > 0 ? mediumValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / mediumValueCustomers.length : 0
    },
    {
      segment: 'low_value' as const,
      count: lowValueCustomers.length,
      totalSpent: lowValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: lowValueCustomers.length > 0 ? lowValueCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / lowValueCustomers.length : 0
    },
    {
      segment: 'new' as const,
      count: newCustomersList.length,
      totalSpent: newCustomersList.reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: newCustomersList.length > 0 ? newCustomersList.reduce((sum, c) => sum + c.totalSpent, 0) / newCustomersList.length : 0
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
    const amount = typeof record.金額 === 'number' ? record.金額 : Number(record.金額) || 0;
    trend.totalRevenue += amount;

    // 新規顧客かリピーターかを判定
    const customerName = record.購入者 || record.顧客名 || '不明';
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

// リピーター顧客の詳細情報を取得（購入タイプ別）
export interface CustomerDetailInfo extends RepeatCustomer {
  planPurchaseCount: number;  // プラン購入回数
  singlePurchaseCount: number;  // 単品購入回数
  tipCount: number;  // チップ回数（対象が「チップ」や「投げ銭」などを含む場合）
  superCommentCount: number;  // スーパーコメント回数
  planTotal: number;  // プラン購入合計額
  singleTotal: number;  // 単品購入合計額
  tipTotal: number;  // チップ合計額
  superCommentTotal: number;  // スーパーコメント合計額
  purchases: FanClubRevenueData[];  // 全購入履歴
}

export const getCustomerDetailInfo = (data: FanClubRevenueData[]): CustomerDetailInfo[] => {
  // データが配列でない場合は空の結果を返す
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // 顧客ごとの購入データを集計
  const customerData = new Map<string, {
    name: string;
    totalSpent: number;
    purchaseCount: number;
    planPurchaseCount: number;
    singlePurchaseCount: number;
    tipCount: number;
    planTotal: number;
    singleTotal: number;
    tipTotal: number;
    purchases: FanClubRevenueData[];
    firstPurchaseDate: string;
    lastPurchaseDate: string;
  }>();

  data.forEach(record => {
    const customerName = record.購入者 || record.顧客名 || '不明';
    const amount = typeof record.金額 === 'number' ? record.金額 : Number(record.金額) || 0;
    const purchaseDate = record.日付 || '';
    const purchaseType = record.種類 || '';
    const target = (record.対象 || '').toLowerCase();
    
    // チップかどうかを判定（対象に「チップ」「投げ銭」「tip」などが含まれる場合）
    const isTip = target.includes('チップ') || target.includes('投げ銭') || target.includes('tip') || target.includes('donation');
    
    // スーパーコメントかどうかを判定
    const isSuperComment = target.includes('スーパーコメント') || target.includes('super comment') || 
                           purchaseType.includes('スーパーコメント') || purchaseType.includes('コメント');
    
    if (!customerData.has(customerName)) {
      customerData.set(customerName, {
        name: customerName,
        totalSpent: 0,
        purchaseCount: 0,
        planPurchaseCount: 0,
        singlePurchaseCount: 0,
        tipCount: 0,
        superCommentCount: 0,  // 🔥 スーパーコメント追加
        planTotal: 0,
        singleTotal: 0,
        tipTotal: 0,
        superCommentTotal: 0,  // 🔥 スーパーコメント金額追加
        purchases: [],
        firstPurchaseDate: '',
        lastPurchaseDate: ''
      });
    }
    
    const customer = customerData.get(customerName)!;
    customer.totalSpent += amount;
    customer.purchaseCount += 1;
    customer.purchases.push(record);
    
    // 購入タイプ別に集計
    if (isTip) {
      customer.tipCount += 1;
      customer.tipTotal += amount;
    } else if (isSuperComment) {
      customer.superCommentCount += 1;
      customer.superCommentTotal += amount;
    } else if (purchaseType === 'プラン購入') {
      customer.planPurchaseCount += 1;
      customer.planTotal += amount;
    } else if (purchaseType === '単品販売') {
      customer.singlePurchaseCount += 1;
      customer.singleTotal += amount;
    } else {
      // 🔥 どのタイプにも該当しない場合はログ出力
      console.warn('未分類の購入タイプ:', { purchaseType, target, customerName });
    }
    
    // 最初と最後の購入日を更新（日付が有効な場合のみ）
    if (purchaseDate) {
      // 初回購入日が空、または現在の日付の方が古い場合
      if (!customer.firstPurchaseDate || purchaseDate < customer.firstPurchaseDate) {
        customer.firstPurchaseDate = purchaseDate;
      }
      // 最終購入日が空、または現在の日付の方が新しい場合
      if (!customer.lastPurchaseDate || purchaseDate > customer.lastPurchaseDate) {
        customer.lastPurchaseDate = purchaseDate;
      }
    }
  });

  // リピーター（2回以上購入）のみを返す
  return Array.from(customerData.values())
    .filter(c => c.purchaseCount > 1)
    .map(customer => {
      // 月別支出を集計
      const monthlySpendingMap = new Map<string, { year: number; month: number; amount: number; transactions: number }>();
      customer.purchases.forEach(purchase => {
        // 日付が存在しない、または無効な場合はスキップ
        if (!purchase.日付) {
          console.warn('日付がありません:', purchase);
          return;
        }
        
        const date = new Date(purchase.日付);
        
        // 無効な日付の場合はスキップ
        if (isNaN(date.getTime())) {
          console.warn('無効な日付:', purchase.日付);
          return;
        }
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!monthlySpendingMap.has(monthKey)) {
          monthlySpendingMap.set(monthKey, { year, month, amount: 0, transactions: 0 });
        }
        
        const monthData = monthlySpendingMap.get(monthKey)!;
        const amount = typeof purchase.金額 === 'number' ? purchase.金額 : Number(purchase.金額) || 0;
        monthData.amount += amount;
        monthData.transactions += 1;
      });
      
      const monthlySpending = Array.from(monthlySpendingMap.values())
        .sort((a, b) => a.year - b.year || a.month - b.month);
      
      return {
        buyerName: customer.name,
        totalTransactions: customer.purchaseCount,
        totalSpent: customer.totalSpent,
        averageTransactionValue: customer.totalSpent / customer.purchaseCount,
        firstPurchaseDate: customer.firstPurchaseDate,
        lastPurchaseDate: customer.lastPurchaseDate,
        purchaseFrequency: calculatePurchaseFrequency(customer.firstPurchaseDate, customer.lastPurchaseDate, customer.purchaseCount),
        models: [],
        monthlySpending,
        planPurchaseCount: customer.planPurchaseCount,
        singlePurchaseCount: customer.singlePurchaseCount,
        tipCount: customer.tipCount,
        superCommentCount: customer.superCommentCount,  // 🔥 追加
        planTotal: customer.planTotal,
        singleTotal: customer.singleTotal,
        tipTotal: customer.tipTotal,
        superCommentTotal: customer.superCommentTotal,  // 🔥 追加
        purchases: customer.purchases
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
};
