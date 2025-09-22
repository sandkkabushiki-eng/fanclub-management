'use client';

import { useState } from 'react';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit3,
  DollarSign,
  Package
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

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    const newData = editedData.filter((_, i) => i !== index);
    setEditedData(newData);
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
  };

  const handleSaveEdit = (index: number, updatedRecord: FanClubRevenueData) => {
    const newData = [...editedData];
    newData[index] = updatedRecord;
    setEditedData(newData);
    setEditingIndex(null);
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
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Edit3 className="h-6 w-6 mr-2" />
              CSVデータ編集
            </h2>
            <p className="text-gray-600 mt-1">
              {modelName} - {year}年{month}月
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </button>
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
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-800">総手数料</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(totalFees)}</p>
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
            className="text-red-600 hover:text-red-900"
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
