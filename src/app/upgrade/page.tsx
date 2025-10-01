'use client';

import { useState } from 'react';
import { Crown, Check, CreditCard, ArrowRight } from 'lucide-react';
import { PLANS } from '@/lib/stripe';

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('monthly');

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // ユーザーIDを取得（実際の実装では認証から取得）
      const response = await fetch('/api/auth/user');
      const user = await response.json();
      
      if (!user?.id) {
        alert('ログインが必要です');
        return;
      }

      // Stripe Checkoutセッションを作成
      const checkoutResponse = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user.id,
        }),
      });

      const { url } = await checkoutResponse.json();
      
      if (url) {
        window.location.href = url;
      } else {
        alert('決済ページの作成に失敗しました');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'CSVデータの詳細分析',
    '高度なレポート生成',
    'データの自動バックアップ',
    '優先サポート',
    '無制限のデータ保存',
    'APIアクセス',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-6">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            プレミアムプランにアップグレード
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            より多くの機能とツールで、ファンクラブの売上管理を次のレベルへ
          </p>
        </div>

        {/* プラン選択 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* 月額プラン */}
          <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all ${
            selectedPlan === 'monthly' 
              ? 'border-purple-500 ring-4 ring-purple-200' 
              : 'border-gray-200 hover:border-purple-300'
          }`}>
            <div className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">月額プラン</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  ¥{PLANS.monthly.price.toLocaleString()}
                  <span className="text-lg text-gray-600 font-normal">/月</span>
                </div>
                <p className="text-gray-600">月額払いで始める</p>
              </div>

              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  selectedPlan === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedPlan === 'monthly' ? '選択中' : '選択する'}
              </button>
            </div>
          </div>

          {/* 年額プラン */}
          <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all ${
            selectedPlan === 'yearly' 
              ? 'border-purple-500 ring-4 ring-purple-200' 
              : 'border-gray-200 hover:border-purple-300'
          }`}>
            <div className="p-8">
              {/* お得バッジ */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  年額で17%お得！
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">年額プラン</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  ¥{PLANS.yearly.price.toLocaleString()}
                  <span className="text-lg text-gray-600 font-normal">/年</span>
                </div>
                <p className="text-gray-600">
                  月額 ¥{Math.round(PLANS.yearly.price / 12).toLocaleString()} 相当
                </p>
              </div>

              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  selectedPlan === 'yearly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedPlan === 'yearly' ? '選択中' : '選択する'}
              </button>
            </div>
          </div>
        </div>

        {/* 機能一覧 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            プレミアム機能
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 決済ボタン */}
        <div className="text-center">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                処理中...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-3" />
                今すぐアップグレード
                <ArrowRight className="h-5 w-5 ml-3" />
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            決済は安全なStripeを使用して処理されます
          </p>
        </div>

        {/* よくある質問 */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            よくある質問
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                いつでもキャンセルできますか？
              </h3>
              <p className="text-gray-600">
                はい、いつでもキャンセルできます。キャンセル後も現在の期間が終了するまで利用可能です。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                返金ポリシーはありますか？
              </h3>
              <p className="text-gray-600">
                初回購入から30日以内であれば、全額返金いたします。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                プランの変更は可能ですか？
              </h3>
              <p className="text-gray-600">
                はい、いつでもプランを変更できます。差額は次回請求時に反映されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

