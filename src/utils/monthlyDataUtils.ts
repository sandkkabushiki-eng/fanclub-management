import { ModelMonthlyData } from '@/types/csv';
import { authManager } from '@/lib/auth';

// ユーザーIDを含むストレージキーを生成
const getUserStorageKey = (baseKey: string): string => {
  const currentUser = authManager.getCurrentUser();
  const userId = currentUser?.id || 'default';
  return `${baseKey}-${userId}`;
};

// 月別データの管理
export const getYearMonthOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  const months = [];
  
  for (let year = currentYear; year >= 2020; year--) {
    years.push(year);
  }
  
  for (let month = 1; month <= 12; month++) {
    months.push(month);
  }
  
  return { years, months };
};

// 年月のフォーマット
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}年${month}月`;
};

// 月別データの取得
export const getMonthlyData = (): ModelMonthlyData[] => {
  const userKey = getUserStorageKey('fanclub-model-data');
  const data = localStorage.getItem(userKey);
  return data ? JSON.parse(data) : [];
};

// 特定の年月のデータを取得
export const getMonthlyDataByYearMonth = (year: number, month: number): ModelMonthlyData[] => {
  const allData = getMonthlyData();
  return allData.filter(data => data.year === year && data.month === month);
};

// モデル別の月別データを取得
export const getModelMonthlyDataByModel = (modelId: string): ModelMonthlyData[] => {
  const allData = getMonthlyData();
  return allData.filter(data => data.modelId === modelId);
};
