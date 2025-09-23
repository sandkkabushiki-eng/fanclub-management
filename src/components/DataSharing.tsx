'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { getModelMonthlyData } from '@/utils/modelUtils';

export default function DataSharing() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    
    try {
      const allData = getModelMonthlyData();
      
      if (allData.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
      }

      // CSVデータを生成
      let csvContent = 'モデル名,年月,データ件数,アップロード日時\n';
      
      allData.forEach(data => {
        csvContent += `"${data.modelName}","${data.year}年${data.month}月","${data.data.length}件","${new Date(data.uploadedAt).toLocaleString()}"\n`;
      });

      // ファイルダウンロード
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fanclub-data-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSVファイルをエクスポートしました！');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <FileText className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">データ共有</h2>
        <p className="text-gray-600">
          データをCSVファイルとしてエクスポートできます
        </p>
      </div>

      {/* エクスポート機能 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          取引データCSV出力
        </h3>
        <p className="text-gray-600 mb-4">
          アップロード済みの全データをCSVファイルとしてダウンロードできます。
        </p>
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
        >
          <Download className="h-5 w-5" />
          <span>{isExporting ? 'エクスポート中...' : 'CSV出力'}</span>
        </button>
      </div>

      {/* 自動共有について */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          自動データ共有について
        </h3>
        <p className="text-blue-800">
          CSVファイルをアップロードすると、自動的にクラウドに同期され、
          他のユーザーも同じデータを確認できるようになります。
        </p>
      </div>
    </div>
  );
}