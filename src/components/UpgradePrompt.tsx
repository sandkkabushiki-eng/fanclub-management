'use client';

import { useState } from 'react';
import { Crown, X, Sparkles, Users, Database, BarChart3, Zap } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  type: 'model_limit' | 'data_limit' | 'feature';
  isOpen: boolean;
  onClose: () => void;
}

const PROMPT_CONFIG = {
  model_limit: {
    icon: Users,
    title: '2人目のモデルを追加しませんか？',
    description: '無料プランでは1人までですが、プロプランなら無制限にモデルを登録できます。',
    benefits: [
      'モデル登録無制限',
      '複数モデルの一括管理',
      '比較分析レポート',
    ],
  },
  data_limit: {
    icon: Database,
    title: '過去のデータも活用しませんか？',
    description: '無料プランは2ヶ月分のデータ保存ですが、プロプランなら無制限に保存できます。',
    benefits: [
      'データ保存無制限',
      '長期トレンド分析',
      '年間比較レポート',
    ],
  },
  feature: {
    icon: BarChart3,
    title: 'より詳細な分析を解放しませんか？',
    description: 'プロプランなら、AI提案や詳細分析など、すべての機能が使えます。',
    benefits: [
      'AI収益最適化提案',
      '詳細分析ダッシュボード',
      'CSVエクスポート',
    ],
  },
};

export function UpgradePrompt({ type, isOpen, onClose }: UpgradePromptProps) {
  if (!isOpen) return null;

  const config = PROMPT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ヘッダー部分（グラデーション背景） */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 px-6 pt-8 pb-12 text-white text-center relative overflow-hidden">
          {/* 背景パターン */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          </div>
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
            <p className="text-white/80 text-sm">{config.description}</p>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-6 -mt-6">
          {/* プロプランカード */}
          <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-purple-100 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <span className="font-bold text-gray-900">プロプラン</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-purple-600">¥2,980</span>
                <span className="text-gray-500 text-sm">/月</span>
              </div>
            </div>

            <ul className="space-y-3">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-gray-700 text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAボタン */}
          <Link href="/upgrade" className="block">
            <button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2">
              <Zap className="h-5 w-5" />
              プロプランにアップグレード
            </button>
          </Link>

          {/* スキップリンク */}
          <button
            onClick={onClose}
            className="w-full text-center text-gray-400 text-sm mt-4 hover:text-gray-600 transition-colors"
          >
            あとで検討する
          </button>
        </div>
      </div>
    </div>
  );
}

// 簡易的なフック：プロンプト表示制御
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [promptType, setPromptType] = useState<'model_limit' | 'data_limit' | 'feature'>('model_limit');

  const showPrompt = (type: 'model_limit' | 'data_limit' | 'feature') => {
    setPromptType(type);
    setIsOpen(true);
  };

  const closePrompt = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    promptType,
    showPrompt,
    closePrompt,
  };
}

