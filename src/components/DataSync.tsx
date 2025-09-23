'use client';

import { useState } from 'react';
import { Cloud, CloudOff, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { syncLocalDataToSupabase, syncSupabaseDataToLocal } from '@/utils/supabaseUtils';

interface DataSyncProps {
  onDataChange: () => void;
}

export default function DataSync({ onDataChange }: DataSyncProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUploadToCloud = async () => {
    setIsUploading(true);
    setSyncResult(null);
    
    try {
      const result = await syncLocalDataToSupabase();
      setSyncResult(result);
      
      if (result.success) {
        onDataChange();
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `アップロードエラー: ${error}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    setIsDownloading(true);
    setSyncResult(null);
    
    try {
      const result = await syncSupabaseDataToLocal();
      setSyncResult(result);
      
      if (result.success) {
        onDataChange();
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `ダウンロードエラー: ${error}`
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Cloud className="h-5 w-5 mr-2" />
          クラウドデータ同期
        </h3>
      </div>

      {/* 同期説明 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="text-md font-semibold text-blue-900 mb-3">
          データ共有について
        </h4>
        <div className="text-blue-800 text-sm space-y-2">
          <p><strong>クラウド同期により、URLにアクセスした全員が同じデータを共有できます！</strong></p>
          <p>• <strong>アップロード</strong>: あなたのローカルデータをクラウドに保存</p>
          <p>• <strong>ダウンロード</strong>: クラウドの最新データを取得</p>
          <p>• データは自動的に全ユーザー間で同期されます</p>
        </div>
      </div>

      {/* 同期ボタン */}
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          データ同期
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleUploadToCloud}
            disabled={isUploading || isDownloading}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Cloud className="h-5 w-5" />
            <span>{isUploading ? 'アップロード中...' : 'クラウドにアップロード'}</span>
          </button>
          
          <button
            onClick={handleDownloadFromCloud}
            disabled={isUploading || isDownloading}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CloudOff className="h-5 w-5" />
            <span>{isDownloading ? 'ダウンロード中...' : 'クラウドからダウンロード'}</span>
          </button>
        </div>
        
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
            syncResult.success 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}
      </div>

      {/* 使用方法 */}
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          使用方法
        </h4>
        <div className="text-gray-700 text-sm space-y-2">
          <p><strong>1. 初回セットアップ</strong></p>
          <p>• データを入力後、「クラウドにアップロード」をクリック</p>
          <p>• これで他の人も同じデータを見ることができます</p>
          
          <p className="mt-4"><strong>2. 日常的な使用</strong></p>
          <p>• データを更新したら「クラウドにアップロード」</p>
          <p>• 他の人の更新を確認したい場合は「クラウドからダウンロード」</p>
          
          <p className="mt-4"><strong>3. チームでの使用</strong></p>
          <p>• 全員が同じURLにアクセス</p>
          <p>• データの更新時は必ずアップロードを忘れずに</p>
        </div>
      </div>
    </div>
  );
}
