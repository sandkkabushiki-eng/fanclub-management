'use client';

import { useState } from 'react';
import {
  Upload,
  BarChart3,
  Users,
  Share2
} from 'lucide-react';
import { CSVData, FanClubRevenueData } from '@/types/csv';
import { upsertModelMonthlyData, getModels } from '@/utils/modelUtils';
import CSVUploader from '@/components/CSVUploaderNew';
import ModelManagement from '@/components/ModelManagement';
import ModelDataManagement from '@/components/ModelDataManagement';
import DataSharing from '@/components/DataSharing';

type TabType = 'upload' | 'models' | 'management' | 'sharing';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [error, setError] = useState<string>('');

  const handleDataLoaded = (data: CSVData[], year: number, month: number, modelId: string) => {
    // モデル別月別データとして保存
    const model = getModels().find(m => m.id === modelId);
    if (model) {
      upsertModelMonthlyData(modelId, model.displayName, year, month, data as FanClubRevenueData[]);
    }
    
    
    setError('');
    setActiveTab('models');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };


  const handleModelChange = () => {
  };

  const tabs = [
    { id: 'upload', label: 'CSVアップロード', icon: Upload },
    { id: 'models', label: 'モデル管理', icon: Users },
    { id: 'management', label: 'データ管理・分析', icon: BarChart3 },
    { id: 'sharing', label: 'データ共有', icon: Share2 }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ファンクラブ売上管理システム
          </h1>
          <p className="text-lg text-gray-600">
            CSVデータ分析・売上管理・収益配分計算
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="flex flex-wrap justify-center mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-6 py-3 m-1 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* タブコンテンツ */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'upload' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Upload className="h-6 w-6 mr-2" />
                CSVファイルアップロード
              </h2>
              <CSVUploader onDataLoaded={handleDataLoaded} onError={handleError} />
              
              {/* CSV形式の説明 */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">CSVファイルの形式</h3>
                <p className="text-gray-700 mb-4">
                  以下の項目を含むCSVファイルをアップロードしてください：
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>日付</strong> - 購入日（YYYY-MM-DD形式）</li>
                  <li><strong>金額</strong> - 売上金額（数値）</li>
                  <li><strong>手数料</strong> - サイトの手数料（数値）</li>
                  <li><strong>種類</strong> - プラン購入 or 単品販売</li>
                  <li><strong>対象</strong> - プラン名 or 作品名</li>
                  <li><strong>購入者</strong> - 購入者の名前</li>
                </ul>
                <p className="text-sm text-gray-500 mt-4">
                  ※ 対象URL、ユーザページURL、プラン解約日は無視されます
                </p>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-2" />
                モデル管理
              </h2>
              <ModelManagement onModelChange={handleModelChange} />
            </div>
          )}

          {activeTab === 'management' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                データ管理・分析
              </h2>
              <ModelDataManagement onDataChange={handleModelChange} />
            </div>
          )}

          {activeTab === 'sharing' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Share2 className="h-6 w-6 mr-2" />
                データ共有
              </h2>
              <DataSharing onDataChange={handleModelChange} />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}