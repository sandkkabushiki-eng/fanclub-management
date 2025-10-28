// 統計計算の修正版
export const calculateModelStats = (
  modelData: Record<string, any>,
  selectedModelId: string
) => {
  console.log('📊 統計計算開始');
  console.log('📊 選択されたモデルID:', selectedModelId);
  console.log('📊 modelData keys:', Object.keys(modelData));
  
  // 選択されたモデルのデータのみを取得
  let filteredData: any[] = [];
  
  if (selectedModelId && selectedModelId !== 'all') {
    // 特定のモデルのデータを取得
    const modelKey = Object.keys(modelData).find(key => key.includes(selectedModelId));
    if (modelKey) {
      const modelDataItem = modelData[modelKey];
      if (Array.isArray(modelDataItem)) {
        filteredData = modelDataItem;
      } else if (typeof modelDataItem === 'object' && modelDataItem !== null && 'data' in modelDataItem) {
        filteredData = Array.isArray(modelDataItem.data) ? modelDataItem.data : [];
      }
    }
  } else {
    // 全モデルのデータを取得
    filteredData = Object.values(modelData).flatMap(item => {
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null && 'data' in item) {
        return Array.isArray(item.data) ? item.data : [];
      }
      return [];
    });
  }

  console.log('📊 フィルタリング後のデータ数:', filteredData.length);

  const totalRevenue = filteredData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
  const totalCustomers = new Set(filteredData.map(item => item.購入者 || item.顧客名)).size;
  const averageTransactionValue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0;
  
  // リピート率の計算
  const customerPurchaseCounts = new Map<string, number>();
  filteredData.forEach(item => {
    const customer = item.購入者 || item.顧客名 || '不明';
    customerPurchaseCounts.set(customer, (customerPurchaseCounts.get(customer) || 0) + 1);
  });
  const repeatCustomers = Array.from(customerPurchaseCounts.values()).filter(count => count > 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  
  return {
    totalRevenue,
    totalCustomers,
    repeatRate,
    averageTransactionValue
  };
};

