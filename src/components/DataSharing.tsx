'use client';

import { useState } from 'react';
import { Download, FileText, Share2 } from 'lucide-react';
import { getDataStatistics, downloadCSV } from '@/utils/debugUtils';
import { getModelMonthlyData } from '@/utils/modelUtils';

interface DataSharingProps {
  onDataChange: () => void;
}

export default function DataSharing({}: DataSharingProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const modelData = getModelMonthlyData();
      const allTransactions = modelData.flatMap(data => data.data);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(allTransactions, `fanclub-transactions-${timestamp}.csv`);
    } catch (error) {
      console.error('CSV Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const stats = getDataStatistics();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Share2 className="h-5 w-5 mr-2" />
          データ共有・管理
        </h3>
      </div>

      {/* データ統計 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
          データ統計
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-sm text-blue-600">モデル数</p>
            <p className="text-xl font-bold text-blue-900">{stats.models.total}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm text-green-600">月別データ</p>
            <p className="text-xl font-bold text-green-900">{stats.monthlyData.total}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <p className="text-sm text-purple-600">取引数</p>
            <p className="text-xl font-bold text-purple-900">{stats.transactions.total.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <p className="text-sm text-orange-600">総売上</p>
            <p className="text-xl font-bold text-orange-900">¥{stats.transactions.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* CSV出力機能 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          取引データCSV出力
        </h4>
        <div className="flex justify-center">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span>{isExporting ? 'エクスポート中...' : '取引データをCSV出力'}</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">
          取引データをCSV形式で出力します（Excel等で開けます）
        </p>
      </div>

      {/* データ共有の説明 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="text-md font-semibold text-blue-900 mb-3">
          データ共有について
        </h4>
        <div className="text-blue-800 text-sm space-y-2">
          <p><strong>自動データ共有</strong></p>
          <p>• CSVファイルをアップロードすると、自動的に全員にデータが共有されます</p>
          <p>• URLにアクセスした全員が同じデータを見ることができます</p>
          
          <p className="mt-4"><strong>CSV出力</strong></p>
          <p>• 取引データをCSV形式でダウンロードできます</p>
          <p>• Excel等で開いて、詳細な分析が可能です</p>
        </div>
      </div>
    </div>
  );
}
