'use client';

import { useState } from 'react';
import { Download, FileText, BarChart3, Calendar, Users, Settings, CheckCircle } from 'lucide-react';
import { FanClubRevenueData, Model } from '@/types/csv';
import { formatCurrency } from '@/utils/csvUtils';

interface AdvancedExportProps {
  models: Model[];
  modelData: Record<string, Record<number, Record<number, FanClubRevenueData[]>>>;
}

export default function AdvancedExport({ models, modelData }: AdvancedExportProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 利用可能な年と月を取得
  const availableYears = Array.from(new Set(
    Object.values(modelData).flatMap(modelYearData =>
      Object.keys(modelYearData).map(Number)
    )
  )).sort((a, b) => b - a);

  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleYearToggle = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const handleMonthToggle = (month: number) => {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const selectAllModels = () => {
    setSelectedModels(models.map(m => m.id));
  };

  const selectAllYears = () => {
    setSelectedYears([...availableYears]);
  };

  const selectAllMonths = () => {
    setSelectedMonths([...availableMonths]);
  };

  const clearAllSelections = () => {
    setSelectedModels([]);
    setSelectedYears([]);
    setSelectedMonths([]);
  };

  const exportData = async () => {
    setIsExporting(true);
    
    try {
      // データを収集
      const exportData: Record<string, unknown>[] = [];
      
      selectedModels.forEach(modelId => {
        const model = models.find(m => m.id === modelId);
        if (!model) return;

        selectedYears.forEach(year => {
          selectedMonths.forEach(month => {
            const data = modelData[modelId]?.[year]?.[month];
            if (data && data.length > 0) {
              data.forEach(record => {
                exportData.push({
                  モデル名: model.displayName,
                  年: year,
                  月: month,
                  日付: record.日付,
                  金額: record.金額,
                  手数料: record.手数料,
                  種類: record.種類,
                  対象: record.対象,
                  購入者: record.購入者,
                  顧客名: record.顧客名
                });
              });
            }
          });
        });
      });

      if (exportFormat === 'csv') {
        // CSVエクスポート
        const csvContent = generateCSV(exportData);
        downloadFile(csvContent, 'fanclub-data.csv', 'text/csv');
      } else if (exportFormat === 'excel') {
        // Excelエクスポート（簡易版）
        const excelContent = generateExcel(exportData);
        downloadFile(excelContent, 'fanclub-data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (exportFormat === 'pdf') {
        // PDFエクスポート
        await generatePDF(exportData);
      }

      // 成功通知
      alert('エクスポートが完了しました！');
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポート中にエラーが発生しました。');
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (data: Record<string, unknown>[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];
    
    return csvRows.join('\n');
  };

  const generateExcel = (data: Record<string, unknown>[]): string => {
    // 簡易的なExcel形式（実際の実装ではライブラリを使用）
    return generateCSV(data);
  };

  const generatePDF = async (data: Record<string, unknown>[]): Promise<void> => {
    // PDF生成の実装（実際の実装ではライブラリを使用）
    console.log('PDF generation not implemented yet');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasSelection = selectedModels.length > 0 && selectedYears.length > 0 && selectedMonths.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Download className="h-8 w-8 text-red-600" />
        <h2 className="text-2xl font-bold text-red-600">高度なエクスポート</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* モデル選択 */}
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Users className="h-5 w-5 text-red-600" />
              <span>モデル選択</span>
            </h3>
            <button
              onClick={selectAllModels}
              className="text-sm text-red-600 hover:text-red-800"
            >
              すべて選択
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {models.map(model => (
              <label key={model.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelToggle(model.id)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{model.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 期間選択 */}
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-red-600" />
              <span>期間選択</span>
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAllYears}
                className="text-sm text-red-600 hover:text-red-800"
              >
                全年度
              </button>
              <button
                onClick={selectAllMonths}
                className="text-sm text-red-600 hover:text-red-800"
              >
                全月
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">年</h4>
              <div className="grid grid-cols-3 gap-2 max-h-24 overflow-y-auto">
                {availableYears.map(year => (
                  <label key={year} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => handleYearToggle(year)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs text-gray-700">{year}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">月</h4>
              <div className="grid grid-cols-4 gap-2">
                {availableMonths.map(month => (
                  <label key={month} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month)}
                      onChange={() => handleMonthToggle(month)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs text-gray-700">{month}月</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エクスポート設定 */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-red-600" />
          <span>エクスポート設定</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル形式
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel' | 'pdf')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnalysis}
                onChange={(e) => setIncludeAnalysis(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">分析データを含める</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">グラフを含める</span>
            </label>
          </div>
        </div>
      </div>

      {/* エクスポートボタン */}
      <div className="flex items-center justify-between">
        <button
          onClick={clearAllSelections}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          選択をクリア
        </button>
        
        <button
          onClick={exportData}
          disabled={!hasSelection || isExporting}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
            hasSelection && !isExporting
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>エクスポート中...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>エクスポート実行</span>
            </>
          )}
        </button>
      </div>

      {/* 選択状況表示 */}
      {hasSelection && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">エクスポート準備完了</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {selectedModels.length}モデル、{selectedYears.length}年、{selectedMonths.length}月のデータをエクスポートします
          </p>
        </div>
      )}
    </div>
  );
}
