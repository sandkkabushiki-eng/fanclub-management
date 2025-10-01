'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit3,
  DollarSign,
  Package,
  Check,
  AlertCircle
} from 'lucide-react';
import { FanClubRevenueData } from '@/types/csv';
import { formatCurrency } from '@/utils/csvUtils';

interface CSVDataEditorProps {
  modelId: string;
  modelName: string;
  year: number;
  month: number;
  data: FanClubRevenueData[];
  onSave: (data: FanClubRevenueData[]) => void;
  onCancel: () => void;
}

export default function CSVDataEditor({ 
  modelName, 
  year, 
  month, 
  data, 
  onSave, 
  onCancel 
}: CSVDataEditorProps) {
  const [editedData, setEditedData] = useState<FanClubRevenueData[]>(data);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleAutoSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // 保存のシミュレーション
      onSave(editedData);
      setHasChanges(false);
      setSaveStatus('saved');
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, editedData, onSave]);

  // 変更を検知して自動保存
  useEffect(() => {
    if (hasChanges && editedData.length > 0) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2秒後に自動保存
      
      return () => clearTimeout(timer);
    }
  }, [editedData, hasChanges, handleAutoSave]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    const newData = editedData.filter((_, i) => i !== index);
    setEditedData(newData);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    const newRecord: FanClubRevenueData = {
      日付: new Date().toISOString().split('T')[0],
      金額: 0,
      手数料: 0,
      種類: 'プラン購入',
      対象: '',
      購入者: ''
    };
    setEditedData([...editedData, newRecord]);
    setEditingIndex(editedData.length);
    setHasChanges(true);
  };

  const handleSaveEdit = (index: number, updatedRecord: FanClubRevenueData) => {
    const newData = [...editedData];
    newData[index] = updatedRecord;
    setEditedData(newData);
    setEditingIndex(null);
    setHasChanges(true);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleSaveAll = () => {
    onSave(editedData);
  };

  const totalRevenue = editedData.reduce((sum, item) => sum + (Number(item.金額) || 0), 0);
  const totalFees = editedData.reduce((sum, item) => sum + (Number(item.手数料) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-white to-gray-50 p-6 rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Edit3 className="h-6 w-6 mr-2 text-blue-600" />
              CSVデータ編集
            </h2>
            <p className="text-gray-600 mt-1">
              {modelName} - {year}年{month}月
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 保存ステータス表示 */}
            <div className="flex items-center space-x-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">保存中...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">保存完了</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">保存エラー</span>
                </div>
              )}
              {hasChanges && saveStatus === 'idle' && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">未保存の変更</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                閉じる
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium shadow-md hover:shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                手動保存
              </button>
            </div>
          </div>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">総売上</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">総手数料</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(totalFees)}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">取引数</p>
                <p className="text-lg font-bold text-blue-900">{editedData.length}件</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* データテーブル */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">取引データ</h3>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規追加
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日付
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  手数料
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  種類
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  対象
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  購入者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editedData.map((record, index) => (
                <tr key={index}>
                  {editingIndex === index ? (
                    <EditRow
                      record={record}
                      onSave={(updatedRecord) => handleSaveEdit(index, updatedRecord)}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <DisplayRow
                      record={record}
                      onEdit={() => handleEdit(index)}
                      onDelete={() => handleDelete(index)}
                    />
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 表示行コンポーネント
function DisplayRow({ 
  record, 
  onEdit, 
  onDelete 
}: { 
  record: FanClubRevenueData; 
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  return (
    <>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.日付}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(Number(record.金額) || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(Number(record.手数料) || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className={`px-2 py-1 text-xs rounded-full ${
          record.種類 === 'プラン購入' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {record.種類}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.対象}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.購入者}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-blue-600 hover:text-blue-900"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  );
}

// 編集行コンポーネント
function EditRow({ 
  record, 
  onSave, 
  onCancel 
}: { 
  record: FanClubRevenueData; 
  onSave: (record: FanClubRevenueData) => void; 
  onCancel: () => void; 
}) {
  const [editedRecord, setEditedRecord] = useState<FanClubRevenueData>(record);

  const handleSave = () => {
    onSave(editedRecord);
  };

  return (
    <>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="date"
          value={editedRecord.日付 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 日付: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="number"
          value={editedRecord.金額 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 金額: Number(e.target.value) })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="number"
          value={editedRecord.手数料 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 手数料: Number(e.target.value) })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={editedRecord.種類 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 種類: e.target.value as 'プラン購入' | '単品販売' })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="プラン購入">プラン購入</option>
          <option value="単品販売">単品販売</option>
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="text"
          value={editedRecord.対象 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 対象: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="text"
          value={editedRecord.購入者 || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, 購入者: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-900"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  );
}
