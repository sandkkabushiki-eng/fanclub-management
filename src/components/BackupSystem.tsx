'use client';

import { useState, useEffect } from 'react';
import { Save, Download, Upload, Clock, CheckCircle, AlertTriangle, Database, Cloud } from 'lucide-react';
import { Model } from '@/types/csv';

interface BackupSystemProps {
  models: Model[];
  modelData: any;
}

interface BackupInfo {
  id: string;
  name: string;
  timestamp: Date;
  size: number;
  type: 'manual' | 'auto';
  description: string;
}

export default function BackupSystem({ models, modelData }: BackupSystemProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupInterval, setBackupInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    loadBackups();
    loadAutoBackupSettings();
  }, []);

  const loadBackups = () => {
    const savedBackups = localStorage.getItem('fanclub-backups');
    if (savedBackups) {
      setBackups(JSON.parse(savedBackups).map((b: any) => ({
        ...b,
        timestamp: new Date(b.timestamp)
      })));
    }
  };

  const loadAutoBackupSettings = () => {
    const settings = localStorage.getItem('fanclub-auto-backup');
    if (settings) {
      const parsed = JSON.parse(settings);
      setAutoBackupEnabled(parsed.enabled);
      setBackupInterval(parsed.interval);
    }
  };

  const saveBackups = (newBackups: BackupInfo[]) => {
    localStorage.setItem('fanclub-backups', JSON.stringify(newBackups));
    setBackups(newBackups);
  };

  const createBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      const backupData = {
        models,
        modelData,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const backupInfo: BackupInfo = {
        id: `backup-${Date.now()}`,
        name: `バックアップ_${new Date().toLocaleString('ja-JP')}`,
        timestamp: new Date(),
        size: JSON.stringify(backupData).length,
        type: 'manual',
        description: '手動バックアップ'
      };

      // ローカルストレージに保存
      const newBackups = [backupInfo, ...backups.slice(0, 9)]; // 最新10件まで保持
      saveBackups(newBackups);

      // ファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fanclub-backup-${backupInfo.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('バックアップが作成されました！');
    } catch (error) {
      console.error('Backup creation error:', error);
      alert('バックアップの作成中にエラーが発生しました。');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    setIsRestoring(true);
    
    try {
      // ファイル選択ダイアログを表示
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const backupData = JSON.parse(e.target?.result as string);
              
              // データを復元
              if (backupData.models) {
                localStorage.setItem('fanclub-models', JSON.stringify(backupData.models));
              }
              if (backupData.modelData) {
                localStorage.setItem('fanclub-model-data', JSON.stringify(backupData.modelData));
              }

              alert('バックアップが復元されました！ページを再読み込みしてください。');
              window.location.reload();
            } catch (error) {
              console.error('Restore error:', error);
              alert('バックアップファイルの復元中にエラーが発生しました。');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } catch (error) {
      console.error('Restore error:', error);
      alert('バックアップの復元中にエラーが発生しました。');
    } finally {
      setIsRestoring(false);
    }
  };

  const deleteBackup = (backupId: string) => {
    if (confirm('このバックアップを削除しますか？')) {
      const newBackups = backups.filter(b => b.id !== backupId);
      saveBackups(newBackups);
    }
  };

  const toggleAutoBackup = () => {
    const newEnabled = !autoBackupEnabled;
    setAutoBackupEnabled(newEnabled);
    
    const settings = {
      enabled: newEnabled,
      interval: backupInterval
    };
    localStorage.setItem('fanclub-auto-backup', JSON.stringify(settings));

    if (newEnabled) {
      scheduleAutoBackup();
    } else {
      clearAutoBackup();
    }
  };

  const scheduleAutoBackup = () => {
    // 自動バックアップのスケジュール設定
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };

    const interval = intervals[backupInterval];
    setInterval(() => {
      if (autoBackupEnabled) {
        createAutoBackup();
      }
    }, interval);
  };

  const createAutoBackup = async () => {
    try {
      const backupData = {
        models,
        modelData,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const backupInfo: BackupInfo = {
        id: `auto-backup-${Date.now()}`,
        name: `自動バックアップ_${new Date().toLocaleString('ja-JP')}`,
        timestamp: new Date(),
        size: JSON.stringify(backupData).length,
        type: 'auto',
        description: `${backupInterval}自動バックアップ`
      };

      const newBackups = [backupInfo, ...backups.slice(0, 9)];
      saveBackups(newBackups);
    } catch (error) {
      console.error('Auto backup error:', error);
    }
  };

  const clearAutoBackup = () => {
    // 自動バックアップのクリア
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Database className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">データバックアップ</h2>
      </div>

      {/* バックアップ作成 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Save className="h-5 w-5 text-red-600" />
          <span>バックアップ作成</span>
        </h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={createBackup}
            disabled={isCreatingBackup}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              !isCreatingBackup
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isCreatingBackup ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>作成中...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>バックアップ作成</span>
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-600">
            現在のデータをバックアップファイルとして保存します
          </p>
        </div>
      </div>

      {/* 自動バックアップ設定 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="h-5 w-5 text-red-600" />
          <span>自動バックアップ設定</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={toggleAutoBackup}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">自動バックアップを有効にする</span>
            </label>
          </div>
          
          {autoBackupEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                バックアップ間隔
              </label>
              <select
                value={backupInterval}
                onChange={(e) => setBackupInterval(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="daily">毎日</option>
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* バックアップ一覧 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Cloud className="h-5 w-5 text-red-600" />
          <span>バックアップ一覧</span>
        </h3>
        
        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            バックアップがありません
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  {backup.type === 'auto' ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Save className="h-5 w-5 text-green-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{backup.name}</p>
                    <p className="text-sm text-gray-500">
                      {backup.timestamp.toLocaleString('ja-JP')} • {formatFileSize(backup.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => restoreBackup(backup.id)}
                    disabled={isRestoring}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4 inline mr-1" />
                    復元
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 復元 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Upload className="h-5 w-5 text-red-600" />
          <span>バックアップから復元</span>
        </h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => restoreBackup('')}
            disabled={isRestoring}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              !isRestoring
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRestoring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>復元中...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>ファイルから復元</span>
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-600">
            バックアップファイルを選択してデータを復元します
          </p>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">注意事項</h4>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• バックアップは最新10件まで保存されます</li>
              <li>• 復元時は現在のデータが上書きされます</li>
              <li>• 重要なデータは定期的にバックアップを取ることをお勧めします</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
