import { ModelMonthlyData, FanClubRevenueData } from '@/types/csv';
import { getModels, getModelMonthlyData } from './modelUtils';

// 全データのエクスポート
export const exportAllData = () => {
  const models = getModels();
  const modelData = getModelMonthlyData();
  
  const exportData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    models,
    modelData,
    summary: {
      totalModels: models.length,
      totalMonthlyRecords: modelData.length,
      totalTransactions: modelData.reduce((sum, data) => sum + data.data.length, 0),
      dateRange: modelData.length > 0 ? {
        earliest: Math.min(...modelData.map(d => new Date(`${d.year}-${d.month}-01`).getTime())),
        latest: Math.max(...modelData.map(d => new Date(`${d.year}-${d.month}-01`).getTime()))
      } : null
    }
  };
  
  return exportData;
};

// データのインポート
export const importAllData = (importData: {
  models: any[];
  modelData: ModelMonthlyData[];
}) => {
  try {
    // バリデーション
    if (!importData.models || !importData.modelData) {
      throw new Error('Invalid data format');
    }
    
    // ローカルストレージに保存
    localStorage.setItem('fanclub-models', JSON.stringify(importData.models));
    localStorage.setItem('fanclub-model-data', JSON.stringify(importData.modelData));
    
    return { success: true, message: 'データのインポートが完了しました' };
  } catch (error) {
    return { success: false, message: `インポートエラー: ${error}` };
  }
};

// データの検証
export const validateData = () => {
  const issues: string[] = [];
  const models = getModels();
  const modelData = getModelMonthlyData();
  
  // モデルの検証
  models.forEach((model, index) => {
    if (!model.id || !model.name || !model.displayName) {
      issues.push(`モデル${index + 1}: 必須フィールドが不足しています`);
    }
  });
  
  // 月別データの検証
  modelData.forEach((data, index) => {
    if (!data.modelId || !data.year || !data.month) {
      issues.push(`月別データ${index + 1}: 必須フィールドが不足しています`);
    }
    
    if (!data.data || !Array.isArray(data.data)) {
      issues.push(`月別データ${index + 1}: データ配列が無効です`);
    }
    
    // データの整合性チェック
    data.data.forEach((transaction, tIndex) => {
      if (!transaction.購入者 || !transaction.金額) {
        issues.push(`月別データ${index + 1}の取引${tIndex + 1}: 購入者または金額が不足しています`);
      }
    });
  });
  
  return {
    isValid: issues.length === 0,
    issues,
    summary: {
      totalModels: models.length,
      totalMonthlyRecords: modelData.length,
      totalTransactions: modelData.reduce((sum, data) => sum + data.data.length, 0)
    }
  };
};

// データのクリア
export const clearAllData = () => {
  localStorage.removeItem('fanclub-models');
  localStorage.removeItem('fanclub-model-data');
  return { success: true, message: '全データがクリアされました' };
};

// データの統計情報
export const getDataStatistics = () => {
  const models = getModels();
  const modelData = getModelMonthlyData();
  
  const stats = {
    models: {
      total: models.length,
      active: models.filter(m => m.status === 'active').length,
      inactive: models.filter(m => m.status === 'inactive').length
    },
    monthlyData: {
      total: modelData.length,
      byYear: modelData.reduce((acc, data) => {
        acc[data.year] = (acc[data.year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      byModel: modelData.reduce((acc, data) => {
        acc[data.modelId] = (acc[data.modelId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    },
    transactions: {
      total: modelData.reduce((sum, data) => sum + data.data.length, 0),
      totalRevenue: modelData.reduce((sum, data) => 
        sum + data.data.reduce((tSum, t) => tSum + (Number(t.金額) || 0), 0), 0),
      totalFees: modelData.reduce((sum, data) => 
        sum + data.data.reduce((tSum, t) => tSum + (Number(t.手数料) || 0), 0), 0)
    }
  };
  
  return stats;
};

// CSVデータのダウンロード
export const downloadCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// JSONデータのダウンロード
export const downloadJSON = (data: Record<string, any>, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
