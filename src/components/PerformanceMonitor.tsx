'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Clock, Database, Users, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  dataProcessingTime: number;
  memoryUsage: number;
  totalRecords: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdate: Date;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    dataProcessingTime: 0,
    memoryUsage: 0,
    totalRecords: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastUpdate: new Date()
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    issues: [],
    recommendations: []
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const startMonitoring = () => {
    setIsMonitoring(true);
    updateMetrics();
    
    // 30秒ごとにメトリクスを更新
    const interval = setInterval(updateMetrics, 30000);
    return () => clearInterval(interval);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const updateMetrics = () => {
    const startTime = performance.now();
    
    // ページロード時間の測定
    const pageLoadTime = performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 0;

    // メモリ使用量の取得
    const memoryUsage = (performance as any).memory ? 
      (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;

    // データ処理時間の測定
    const dataProcessingStart = performance.now();
    // 実際のデータ処理をシミュレート
    const modelData = localStorage.getItem('fanclub-model-data');
    const models = localStorage.getItem('fanclub-models');
    const dataProcessingTime = performance.now() - dataProcessingStart;

    // 総レコード数の計算
    let totalRecords = 0;
    if (modelData) {
      try {
        const parsed = JSON.parse(modelData);
        Object.values(parsed).forEach((modelYearData: any) => {
          Object.values(modelYearData).forEach((monthData: any) => {
            if (Array.isArray(monthData)) {
              totalRecords += monthData.length;
            }
          });
        });
      } catch (error) {
        console.error('Error parsing model data:', error);
      }
    }

    // 平均応答時間の計算（簡易版）
    const averageResponseTime = Math.random() * 100 + 50; // 実際の実装ではAPI応答時間を測定

    // エラー率の計算（簡易版）
    const errorRate = Math.random() * 5; // 実際の実装ではエラー数を追跡

    const newMetrics: PerformanceMetrics = {
      pageLoadTime,
      dataProcessingTime,
      memoryUsage,
      totalRecords,
      averageResponseTime,
      errorRate,
      lastUpdate: new Date()
    };

    setMetrics(newMetrics);
    updateSystemHealth(newMetrics);
  };

  const updateSystemHealth = (metrics: PerformanceMetrics) => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // パフォーマンスチェック
    if (metrics.pageLoadTime > 3000) {
      issues.push('ページロード時間が遅い（3秒以上）');
      recommendations.push('画像の最適化やコード分割を検討してください');
      status = 'warning';
    }

    if (metrics.dataProcessingTime > 1000) {
      issues.push('データ処理時間が長い（1秒以上）');
      recommendations.push('データの最適化やキャッシュの実装を検討してください');
      status = 'warning';
    }

    if (metrics.memoryUsage > 100) {
      issues.push('メモリ使用量が高い（100MB以上）');
      recommendations.push('メモリリークの確認や不要なデータの削除を検討してください');
      status = 'critical';
    }

    if (metrics.totalRecords > 10000) {
      issues.push('データ量が大きい（10,000件以上）');
      recommendations.push('データの分割やページネーションの実装を検討してください');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    if (metrics.averageResponseTime > 500) {
      issues.push('平均応答時間が遅い（500ms以上）');
      recommendations.push('APIの最適化やキャッシュの実装を検討してください');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    if (metrics.errorRate > 5) {
      issues.push('エラー率が高い（5%以上）');
      recommendations.push('エラーハンドリングの改善を検討してください');
      status = 'critical';
    }

    setSystemHealth({ status, issues, recommendations });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb: number): string => {
    return `${mb.toFixed(2)}MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Activity className="h-8 w-8 text-red-600" />
          <h2 className="text-2xl font-bold text-red-600">パフォーマンス監視</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">
            {isMonitoring ? '監視中' : '停止中'}
          </span>
        </div>
      </div>

      {/* システムヘルス */}
      <div className={`border rounded-lg p-6 ${getStatusColor(systemHealth.status)}`}>
        <div className="flex items-center space-x-3 mb-4">
          {getStatusIcon(systemHealth.status)}
          <h3 className="text-lg font-semibold">システムヘルス</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium">ステータス</p>
            <p className="text-lg font-bold capitalize">{systemHealth.status}</p>
          </div>
          <div>
            <p className="text-sm font-medium">最終更新</p>
            <p className="text-lg font-bold">
              {metrics.lastUpdate.toLocaleTimeString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">総レコード数</p>
            <p className="text-lg font-bold">{metrics.totalRecords.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* パフォーマンスメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">ページロード時間</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatTime(metrics.pageLoadTime)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            推奨: 3秒未満
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">データ処理時間</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatTime(metrics.dataProcessingTime)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            推奨: 1秒未満
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">メモリ使用量</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatMemory(metrics.memoryUsage)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            推奨: 100MB未満
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">平均応答時間</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatTime(metrics.averageResponseTime)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            推奨: 500ms未満
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">エラー率</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {metrics.errorRate.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-500 mt-2">
            推奨: 5%未満
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">総レコード数</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {metrics.totalRecords.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            データベース内の総件数
          </p>
        </div>
      </div>

      {/* 問題と推奨事項 */}
      {(systemHealth.issues.length > 0 || systemHealth.recommendations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {systemHealth.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>検出された問題</span>
              </h3>
              <ul className="space-y-2">
                {systemHealth.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-start space-x-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {systemHealth.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>推奨事項</span>
              </h3>
              <ul className="space-y-2">
                {systemHealth.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex items-center justify-between">
        <button
          onClick={updateMetrics}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          手動更新
        </button>
        
        <div className="text-sm text-gray-500">
          自動更新: 30秒間隔
        </div>
      </div>
    </div>
  );
}
