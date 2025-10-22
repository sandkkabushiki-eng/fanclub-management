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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">CSVデータアップロード</h3>
          <p className="text-sm text-gray-600 mt-1">ファンクラブの売上データをCSVファイルでアップロードできます</p>
        </div>
      </div>

      {/* ファイルアップロード */}
      <div className="text-center">
        <div
          className={`border-2 border-dashed rounded-xl p-12 transition-all duration-200 ${
            isDragging 
              ? 'border-pink-500 bg-pink-50 shadow-lg' 
              : 'border-gray-300 hover:border-pink-400 hover:bg-gray-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center">
            <div className="p-4 bg-pink-100 rounded-full mb-4">
              <Upload className="h-8 w-8 text-pink-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              CSVファイルをアップロード
            </h4>
            <p className="text-sm text-gray-600 mb-6 max-w-md">
              ファイルをドラッグ&ドロップするか、下のボタンから選択してください
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors font-medium shadow-sm"
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
      </div>

      {/* ファイル情報 */}
      {fileName && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">{fileName}</p>
              <p className="text-xs text-green-600">ファイルが正常に読み込まれました</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      )}

      {/* 設定 */}
      {parsedData && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">アップロード設定</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 年月選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Calendar className="h-4 w-4 inline mr-2" />
                年月設定
              </label>
              <div className="flex space-x-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                >
                  {generateMonthOptions().map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>

            {/* モデル選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Users className="h-4 w-4 inline mr-2" />
                モデル選択
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
              >
                <option value="">モデルを選択してください</option>
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
                className="w-full bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 transition-colors font-semibold shadow-sm"
              >
                {isLoading ? '処理中...' : 'データをアップロード'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}