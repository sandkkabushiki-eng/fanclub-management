import { MonthlyData, MonthlyDataSummary, FanClubRevenueData } from '@/types/csv';
import { analyzeFanClubRevenue } from './csvUtils';

const STORAGE_KEY = 'fanclub-monthly-data';

// ローカルストレージから月別データを取得
export const getMonthlyData = (): MonthlyData[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load monthly data:', error);
    return [];
  }
};

// ローカルストレージに月別データを保存
export const saveMonthlyData = (data: MonthlyData[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save monthly data:', error);
  }
};

// 特定の年月のデータを取得
export const getMonthlyDataByYearMonth = (year: number, month: number): MonthlyData | null => {
  const allData = getMonthlyData();
  return allData.find(data => data.year === year && data.month === month) || null;
};

// 月別データを追加または更新
export const upsertMonthlyData = (
  year: number, 
  month: number, 
  csvData: FanClubRevenueData[]
): MonthlyData => {
  const allData = getMonthlyData();
  const existingIndex = allData.findIndex(data => data.year === year && data.month === month);
  
  const analysis = analyzeFanClubRevenue(csvData);
  const now = new Date().toISOString();
  
  const monthlyData: MonthlyData = {
    id: existingIndex >= 0 ? allData[existingIndex].id : Date.now().toString(),
    year,
    month,
    data: csvData,
    analysis,
    uploadedAt: existingIndex >= 0 ? allData[existingIndex].uploadedAt : now,
    lastModified: now
  };
  
  if (existingIndex >= 0) {
    allData[existingIndex] = monthlyData;
  } else {
    allData.push(monthlyData);
  }
  
  // 年月でソート
  allData.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  
  saveMonthlyData(allData);
  return monthlyData;
};

// 月別データを削除
export const deleteMonthlyData = (year: number, month: number): boolean => {
  const allData = getMonthlyData();
  const filteredData = allData.filter(data => !(data.year === year && data.month === month));
  
  if (filteredData.length === allData.length) {
    return false; // データが見つからなかった
  }
  
  saveMonthlyData(filteredData);
  return true;
};

// 月別データのサマリー一覧を取得
export const getMonthlyDataSummaries = (): MonthlyDataSummary[] => {
  const allData = getMonthlyData();
  return allData.map(data => ({
    year: data.year,
    month: data.month,
    totalRevenue: data.analysis.totalRevenue,
    totalFees: data.analysis.totalFees,
    totalTransactions: data.analysis.totalTransactions,
    planPurchases: data.analysis.planPurchases,
    singlePurchases: data.analysis.singlePurchases,
    uploadedAt: data.uploadedAt
  }));
};

// 年月の選択肢を生成（過去12ヶ月）
export const getYearMonthOptions = (): { years: number[]; months: number[] } => {
  const now = new Date();
  const years = [];
  const months = [];
  
  // 過去5年から未来1年まで
  for (let year = now.getFullYear() - 5; year <= now.getFullYear() + 1; year++) {
    years.push(year);
  }
  
  // 1月から12月まで
  for (let month = 1; month <= 12; month++) {
    months.push(month);
  }
  
  return { years, months };
};

// 年月のラベルを生成
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}年${month}月`;
};
