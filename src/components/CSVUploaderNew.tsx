'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Calendar, Users } from 'lucide-react';
import { CSVData, Model } from '@/types/csv';
import { parseCSVFile } from '@/utils/csvUtils';
import { getModels } from '@/utils/modelUtils';
import { parseYearMonthFromFileName } from '@/utils/fileNameUtils';

interface CSVUploaderProps {
  onDataLoaded: (data: CSVData[], year: number, month: number, modelId: string) => void;
}

export default function CSVUploader({ onDataLoaded }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models] = useState<Model[]>(getModels());
  const [parsedData, setParsedData] = useState<CSVData[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('CSVファイルを選択してください。');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const data = await parseCSVFile(file);
      setParsedData(data);
      
      // ファイル名から年月を自動判定
      const yearMonth = parseYearMonthFromFileName(file.name);
      if (yearMonth) {
        setSelectedYear(yearMonth.year);
        setSelectedMonth(yearMonth.month);
      }
    } catch (error) {
      console.error('CSV解析エラー:', error);
      alert('CSVファイルの解析に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (!parsedData || !selectedModelId) {
      alert('ファイルを選択し、モデルを選択してください。');
      return;
    }

    onDataLoaded(parsedData, selectedYear, selectedMonth, selectedModelId);
    
    // リセット
    setParsedData(null);
    setFileName('');
    setSelectedModelId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year);
    }
    return years;
  };

  const generateMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  return (
    <div className="space-y-6">
      {/* ファイルアップロード */}
      <div className="text-center">
        <div
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging 
              ? 'border-red-500 bg-red-50' 
              : 'border-red-300 hover:border-red-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            CSVファイルをドラッグ&ドロップ
          </p>
          <p className="text-sm text-gray-500 mb-4">
            または
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            ファイルを選択
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>

      {/* ファイル情報 */}
      {fileName && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">{fileName}</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        </div>
      )}

      {/* 設定 */}
      {parsedData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 年月選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              年月
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {generateYearOptions().map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {generateMonthOptions().map(month => (
                  <option key={month} value={month}>{month}月</option>
                ))}
              </select>
            </div>
          </div>

          {/* モデル選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              モデル
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">モデルを選択</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* アップロードボタン */}
          <div className="flex items-end">
            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? '処理中...' : 'アップロード'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}