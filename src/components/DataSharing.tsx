'use client';

import { useState } from 'react';
import { Download, Upload, Database, FileText, Share2, AlertCircle, CheckCircle } from 'lucide-react';
import { exportAllData, importAllData, validateData, clearAllData, getDataStatistics, downloadCSV, downloadJSON } from '@/utils/debugUtils';
import { getModelMonthlyData } from '@/utils/modelUtils';

interface DataSharingProps {
  onDataChange: () => void;
}

export default function DataSharing({ onDataChange }: DataSharingProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    issues: string[];
    summary: {
      totalModels: number;
      totalMonthlyRecords: number;
      totalTransactions: number;
    };
  } | null>(null);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const data = exportAllData();
      const timestamp = new Date().toISOString().split('T')[0];
      downloadJSON(data, `fanclub-data-backup-${timestamp}.json`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = importAllData(data);
      setImportResult(result);
      
      if (result.success) {
        onDataChange();
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `ファイルの読み込みに失敗しました: ${error}`
      });
    } finally {
      setIsImporting(false);
      // ファイル入力をリセット
      event.target.value = '';
    }
  };

  const handleValidateData = () => {
    const result = validateData();
    setValidationResult(result);
  };

  const handleClearAllData = () => {
    if (confirm('本当に全データを削除しますか？この操作は取り消せません。')) {
      clearAllData();
      onDataChange();
      setValidationResult(null);
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
          <Database className="h-5 w-5 mr-2" />
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

      {/* エクスポート機能 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          データエクスポート
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="h-5 w-5" />
            <span>{isExporting ? 'エクスポート中...' : '全データをエクスポート'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span>{isExporting ? 'エクスポート中...' : '取引データをCSV出力'}</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          • 全データエクスポート: モデル情報、月別データ、分析結果を含む完全なバックアップ<br/>
          • CSV出力: 取引データのみをCSV形式で出力（Excel等で開けます）
        </p>
      </div>

      {/* インポート機能 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          データインポート
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              バックアップファイルを選択
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          
          {importResult && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 ${
              importResult.success 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {importResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{importResult.message}</span>
            </div>
          )}
          
          <p className="text-sm text-gray-600">
            • 全データエクスポートで作成したJSONファイルを選択してください<br/>
            • インポートすると現在のデータは上書きされます
          </p>
        </div>
      </div>

      {/* データ検証・管理 */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          データ検証・管理
        </h4>
        <div className="flex space-x-4">
          <button
            onClick={handleValidateData}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <AlertCircle className="h-4 w-4" />
            <span>データ検証</span>
          </button>
          <button
            onClick={handleClearAllData}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Database className="h-4 w-4" />
            <span>全データ削除</span>
          </button>
        </div>
        
        {validationResult && (
          <div className="mt-4 p-4 rounded-lg border">
            <h5 className="font-medium text-gray-900 mb-2">検証結果</h5>
            <div className={`p-3 rounded-lg ${
              validationResult.isValid 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${
                validationResult.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.isValid ? 'データは正常です' : 'データに問題があります'}
              </p>
              {validationResult.issues.length > 0 && (
                <ul className="mt-2 text-sm text-red-700">
                  {validationResult.issues.map((issue: string, index: number) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 共有方法の説明 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="text-md font-semibold text-blue-900 mb-3">
          データ共有方法
        </h4>
        <div className="text-blue-800 text-sm space-y-2">
          <p><strong>1. データのエクスポート</strong></p>
          <p>• 「全データをエクスポート」でJSONファイルをダウンロード</p>
          <p>• このファイルには全てのデータが含まれています</p>
          
          <p className="mt-4"><strong>2. データの共有</strong></p>
          <p>• エクスポートしたJSONファイルを他の人に送信</p>
          <p>• メール、クラウドストレージ、USBメモリなどで共有可能</p>
          
          <p className="mt-4"><strong>3. データのインポート</strong></p>
          <p>• 他の人が「データインポート」でJSONファイルを読み込み</p>
          <p>• 同じデータで作業を継続できます</p>
        </div>
      </div>
    </div>
  );
}
