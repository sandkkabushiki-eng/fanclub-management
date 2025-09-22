'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { CSVData, Model } from '@/types/csv';
import { parseCSV } from '@/utils/csvUtils';
import { getYearMonthOptions, formatYearMonth } from '@/utils/monthlyDataUtils';
import { getModels } from '@/utils/modelUtils';

interface CSVUploaderProps {
  onDataLoaded: (data: CSVData[], year: number, month: number, modelId: string) => void;
  onError: (error: string) => void;
}

export default function CSVUploader({ onDataLoaded, onError }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
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

    if (!selectedModelId) {
      onError('モデルを選択してください。');
      return;
    }

    setIsLoading(true);
    setUploadStatus('idle');

    try {
      const text = await file.text();
      const data = await parseCSV(text);
      
      if (data.length === 0) {
        onError('CSVファイルが空です。');
        return;
      }

      onDataLoaded(data, selectedYear, selectedMonth, selectedModelId);
      setUploadStatus('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。';
      onError(errorMessage);
      setUploadStatus('error');
    } finally {
      setIsLoading(false);
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* モデル・年月選択 */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearMonthOptions.months.map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          選択中: {selectedModelId ? models.find(m => m.id === selectedModelId)?.displayName : 'モデル未選択'} - {formatYearMonth(selectedYear, selectedMonth)}
        </p>
      </div>

      {/* ファイルアップロード */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : uploadStatus === 'success'
            ? 'border-green-500 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          ) : uploadStatus === 'success' ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : uploadStatus === 'error' ? (
            <AlertCircle className="h-12 w-12 text-red-500" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isLoading 
                ? 'ファイルを読み込み中...' 
                : uploadStatus === 'success'
                ? 'アップロード完了！'
                : uploadStatus === 'error'
                ? 'アップロードエラー'
                : 'ファンクラブ売上CSVファイルをアップロード'
              }
            </h3>
            
            <p className="text-gray-600">
              {isLoading 
                ? 'しばらくお待ちください...'
                : uploadStatus === 'success'
                ? 'データの分析を開始します'
                : uploadStatus === 'error'
                ? 'ファイル形式を確認してください'
                : 'ファイルをドラッグ&ドロップするか、クリックして選択してください'
              }
            </p>
          </div>

          {!isLoading && uploadStatus === 'idle' && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>CSV形式のみ対応（日付、金額、手数料、種類、対象、購入者）</span>
            </div>
          )}
        </div>
      </div>

      {uploadStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">ファイルが正常にアップロードされました</span>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">アップロードに失敗しました</span>
          </div>
        </div>
      )}
    </div>
  );
}
