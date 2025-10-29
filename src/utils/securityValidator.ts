// セキュリティ検証ユーティリティ
// アプリケーションのセキュリティ状態を検証する

import { authManager } from '@/lib/auth';
import { verifyDataIsolation } from './userDataIsolation';

export interface SecurityStatus {
  isAuthenticated: boolean;
  userId: string | null;
  dataIsolationValid: boolean;
  localStorageKeys: string[];
  unsecuredKeys: string[];
  recommendations: string[];
}

// セキュリティ状態を検証
export const validateSecurityStatus = (): SecurityStatus => {
  const currentUser = authManager.getCurrentUser();
  const isAuthenticated = !!currentUser?.id;
  const userId = currentUser?.id || null;
  
  // データ分離の検証
  const dataIsolationValid = verifyDataIsolation();
  
  // ローカルストレージのキーをチェック
  const localStorageKeys: string[] = [];
  const unsecuredKeys: string[] = [];
  
  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageKeys.push(key);
        
        // ユーザー分離されていないキーをチェック
        if (key.includes('fanclub') && userId && !key.includes(`-${userId}`)) {
          unsecuredKeys.push(key);
        }
      }
    }
  }
  
  // 推奨事項を生成
  const recommendations: string[] = [];
  
  if (!isAuthenticated) {
    recommendations.push('ユーザーが認証されていません');
  }
  
  if (!dataIsolationValid) {
    recommendations.push('データ分離が正しく設定されていません');
  }
  
  if (unsecuredKeys.length > 0) {
    recommendations.push(`${unsecuredKeys.length}個のユーザー分離されていないデータが見つかりました`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('セキュリティ状態は正常です');
  }
  
  return {
    isAuthenticated,
    userId,
    dataIsolationValid,
    localStorageKeys,
    unsecuredKeys,
    recommendations
  };
};

// セキュリティレポートを生成
export const generateSecurityReport = (): string => {
  const status = validateSecurityStatus();
  
  let report = '🔐 セキュリティレポート\n';
  report += '='.repeat(50) + '\n\n';
  
  report += `認証状態: ${status.isAuthenticated ? '✅ 認証済み' : '❌ 未認証'}\n`;
  report += `ユーザーID: ${status.userId || 'なし'}\n`;
  report += `データ分離: ${status.dataIsolationValid ? '✅ 正常' : '❌ 異常'}\n\n`;
  
  report += `ローカルストレージキー数: ${status.localStorageKeys.length}\n`;
  if (status.unsecuredKeys.length > 0) {
    report += `⚠️ 未分離キー: ${status.unsecuredKeys.join(', ')}\n`;
  }
  
  report += '\n推奨事項:\n';
  status.recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });
  
  return report;
};

// セキュリティ警告を表示（開発環境のみ）
export const showSecurityWarnings = (): void => {
  const status = validateSecurityStatus();
  
  // 開発環境のみログ出力
  if (process.env.NODE_ENV === 'development') {
    if (!status.isAuthenticated) {
      console.warn('🚨 セキュリティ警告: ユーザーが認証されていません');
    }
    
    if (!status.dataIsolationValid) {
      console.error('🚨 セキュリティエラー: データ分離が正しく設定されていません');
    }
    
    if (status.unsecuredKeys.length > 0) {
      console.error('🚨 セキュリティエラー: ユーザー分離されていないデータが見つかりました:', status.unsecuredKeys);
    }
  }
  
  // 本番環境では致命的なエラーのみログ出力（アラート表示なし）
  if (process.env.NODE_ENV === 'production') {
    if (!status.dataIsolationValid) {
      console.error('🔒 Data isolation check failed');
    }
    // アラート表示は削除（ユーザー体験を損なわないため）
  }
};

// セキュリティ状態をログに出力
export const logSecurityStatus = (): void => {
  const report = generateSecurityReport();
  console.log(report);
};
