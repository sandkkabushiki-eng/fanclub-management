// ファイル名から年月を自動判定する関数
export const parseYearMonthFromFileName = (fileName: string): { year: number; month: number } | null => {
  // ファイル名から拡張子を除去
  let nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // ファイル名から (1), (2), (3) などの番号を除去
  nameWithoutExt = nameWithoutExt.replace(/\s*\(\d+\)\s*$/, '');
  
  // パターン1: MM-YYYY 形式 (例: 05-2025, 12-2024, 05-2025(1))
  const pattern1 = /^(\d{1,2})-(\d{4})/;
  const match1 = nameWithoutExt.match(pattern1);
  if (match1) {
    const month = parseInt(match1[1], 10);
    const year = parseInt(match1[2], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  
  // パターン2: YYYY-MM 形式 (例: 2025-05, 2024-12, 2025-05(1))
  const pattern2 = /^(\d{4})-(\d{1,2})/;
  const match2 = nameWithoutExt.match(pattern2);
  if (match2) {
    const year = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  
  // パターン3: YYYY年MM月 形式 (例: 2025年05月, 2024年12月, 2025年05月(1))
  const pattern3 = /^(\d{4})年(\d{1,2})月/;
  const match3 = nameWithoutExt.match(pattern3);
  if (match3) {
    const year = parseInt(match3[1], 10);
    const month = parseInt(match3[2], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  
  // パターン4: MM月YYYY年 形式 (例: 05月2025年, 12月2024年, 05月2025年(1))
  const pattern4 = /^(\d{1,2})月(\d{4})年/;
  const match4 = nameWithoutExt.match(pattern4);
  if (match4) {
    const month = parseInt(match4[1], 10);
    const year = parseInt(match4[2], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  
  // パターン5: YYYYMM 形式 (例: 202505, 202412, 202505(1))
  const pattern5 = /^(\d{4})(\d{2})/;
  const match5 = nameWithoutExt.match(pattern5);
  if (match5) {
    const year = parseInt(match5[1], 10);
    const month = parseInt(match5[2], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  
  return null;
};

// 年月の妥当性をチェックする関数
export const isValidYearMonth = (year: number, month: number): boolean => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // 過去5年から未来1年まで
  if (year < currentYear - 5 || year > currentYear + 1) {
    return false;
  }
  
  // 月の範囲チェック
  if (month < 1 || month > 12) {
    return false;
  }
  
  // 未来の月は制限
  if (year === currentYear && month > currentMonth) {
    return false;
  }
  
  return true;
};

// 年月をフォーマットする関数
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}年${month}月`;
};

// ファイル名の候補を生成する関数
export const generateFileNameSuggestions = (year: number, month: number): string[] => {
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString();
  
  return [
    `${monthStr}-${yearStr}.csv`,
    `${yearStr}-${monthStr}.csv`,
    `${yearStr}年${monthStr}月.csv`,
    `${monthStr}月${yearStr}年.csv`,
    `${yearStr}${monthStr}.csv`
  ];
};
