'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Calendar, Eye, Play, X, Users, Info } from 'lucide-react';
import { CSVData, Model, FanClubRevenueData } from '@/types/csv';
import { parseCSVFile, analyzeFanClubRevenue, formatCurrency } from '@/utils/csvUtils';
import { getYearMonthOptions, formatYearMonth } from '@/utils/monthlyDataUtils';
import { getModels } from '@/utils/modelUtils';
import { parseYearMonthFromFileName, isValidYearMonth } from '@/utils/fileNameUtils';

interface CSVUploaderProps {
  onDataLoaded: (data: CSVData[], year: number, month: number, modelId: string) => void;
  onError: (error: string) => void;
}

export default function CSVUploader({ onDataLoaded, onError }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [parsedData, setParsedData] = useState<CSVData[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [autoDetectedYearMonth, setAutoDetectedYearMonth] = useState<{year: number, month: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const yearMonthOptions = getYearMonthOptions();

  // モデル一覧を読み込み
  useEffect(() => {
    setModels(getModels());
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('CSVファイルを選択してください。');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const data = await parseCSVFile(file);
      setParsedData(data);
      
      // ファイル名から年月を自動判定
      const yearMonth = parseYearMonthFromFileName(file.name);
      if (yearMonth && isValidYearMonth(yearMonth.year, yearMonth.month)) {
        setAutoDetectedYearMonth(yearMonth);
        setSelectedYear(yearMonth.year);
        setSelectedMonth(yearMonth.month);
      } else {
        setAutoDetectedYearMonth(null);
      }
      
      setShowPreview(true);
    } catch (error) {
      console.error('CSV parsing error:', error);
      onError('CSVファイルの解析に失敗しました。ファイル形式を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = () => {
    if (!parsedData || !selectedModelId) {
      onError('モデルを選択してください。');
      return;
    }

    onDataLoaded(parsedData, selectedYear, selectedMonth, selectedModelId);
    handleReset();
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName('');
    setShowPreview(false);
    setAutoDetectedYearMonth(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const analysis = parsedData ? analyzeFanClubRevenue(parsedData as FanClubRevenueData[]) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!showPreview ? (
        // ファイル選択画面
        <div className="space-y-6">
          {/* ファイルアップロードエリア */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              CSVファイルをアップロード
            </h3>
            <p className="text-gray-600 mb-4">
              ファイルをドラッグ&ドロップするか、クリックして選択してください
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ファイルを選択
            </button>
          </div>

          {/* ファイル名の例 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">推奨ファイル名形式</h4>
                <p className="text-blue-800 text-sm mb-2">
                  ファイル名から年月を自動判定します。以下の形式に対応しています：
                </p>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• <code className="bg-blue-100 px-1 rounded">05-2025.csv</code> (月-年)</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">2025-05.csv</code> (年-月)</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">2025年05月.csv</code> (年月)</li>
                  <li>• <code className="bg-blue-100 px-1 rounded">202505.csv</code> (年月連続)</li>
                </ul>
                <p className="text-blue-800 text-sm mt-2">
                  ※ 同じファイル名でアップロードした場合の <code className="bg-blue-100 px-1 rounded">(1)</code> や <code className="bg-blue-100 px-1 rounded">(2)</code> は自動で無視されます
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // プレビュー・設定画面
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-2" />
                  アップロード設定
                </h2>
                <p className="text-gray-600 mt-1">ファイル: {fileName}</p>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                リセット
              </button>
            </div>
          </div>

          {/* 設定フォーム */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              対象を選択
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  モデル
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">選択してください</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>{model.displayName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {yearMonthOptions.years.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {yearMonthOptions.months.map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 自動判定の結果表示 */}
            {autoDetectedYearMonth && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 text-sm">
                    ファイル名から <strong>{formatYearMonth(autoDetectedYearMonth.year, autoDetectedYearMonth.month)}</strong> を自動判定しました
                  </span>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600 mt-4">
              選択中: {selectedModelId ? models.find(m => m.id === selectedModelId)?.displayName : 'モデル未選択'} - {formatYearMonth(selectedYear, selectedMonth)}
            </p>
          </div>

          {/* データプレビュー */}
          {analysis && (
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                データプレビュー
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-full mr-3">
                      <FileText className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">取引数</p>
                      <p className="text-lg font-bold text-green-900">{analysis.totalTransactions}件</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">売上</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(analysis.totalRevenue)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-full mr-3">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">手数料</p>
                      <p className="text-lg font-bold text-red-900">{formatCurrency(analysis.totalFees)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-full mr-3">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-800">購入者数</p>
                      <p className="text-lg font-bold text-purple-900">{new Set(parsedData?.map(d => d.購入者) || []).size}人</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* アップロードボタン */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!selectedModelId || isLoading}
              className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  処理中...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  アップロード実行
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
