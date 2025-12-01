'use client';

import { useState } from 'react';
import { Crown, Check, X, CreditCard, ArrowRight, Sparkles, Users, Database, BarChart3, Zap, ArrowLeft } from 'lucide-react';
import { PLANS } from '@/lib/stripe';
import { FEATURE_LIST } from '@/types/subscription';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      {/* 背景エフェクト */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        {/* 戻るボタン */}
        <Link href="/app" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-6 shadow-lg shadow-yellow-500/30">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            プロプランにアップグレード
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            すべての機能を解放して、ファンクラブ運営を次のレベルへ
          </p>
        </div>

        {/* プラン比較 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* 無料プラン */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white/70 mb-2">無料プラン</h3>
              <div className="text-4xl font-bold text-white mb-2">
                ¥0
                <span className="text-lg text-white/50 font-normal">/月</span>
              </div>
              <p className="text-white/50 text-sm">現在のプラン</p>
            </div>

            <ul className="space-y-4">
              {FEATURE_LIST.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  {feature.freeValue === true ? (
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                  ) : feature.freeValue === false ? (
                    <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center">
                      <X className="h-3 w-3 text-red-400" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-gray-500/20 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-400">-</span>
                    </div>
                  )}
                  <span className="text-white/70">{feature.label}</span>
                  {typeof feature.freeValue === 'string' && (
                    <span className="ml-auto text-white/50 text-sm">{feature.freeValue}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* プロプラン */}
          <div className="relative bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-xl border-2 border-pink-500/50 rounded-3xl p-8 shadow-xl shadow-pink-500/10">
            {/* 人気バッジ */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                おすすめ
              </span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">プロプラン</h3>
              <div className="text-4xl font-bold text-white mb-2">
                ¥{PLANS.monthly.price.toLocaleString()}
                <span className="text-lg text-white/50 font-normal">/月</span>
              </div>
              <p className="text-white/70 text-sm">年払いなら ¥{Math.round(PLANS.yearly.price / 12).toLocaleString()}/月</p>
            </div>

            <ul className="space-y-4">
              {FEATURE_LIST.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  {feature.proValue === true ? (
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-pink-500/20 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-pink-400" />
                    </div>
                  )}
                  <span className="text-white">{feature.label}</span>
                  {typeof feature.proValue === 'string' && (
                    <span className="ml-auto text-pink-300 text-sm font-medium">{feature.proValue}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 支払いプラン選択 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">支払いプランを選択</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 月額 */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <div className="text-left">
                <h3 className="text-lg font-bold text-white mb-1">月額プラン</h3>
                <div className="text-3xl font-bold text-white">
                  ¥{PLANS.monthly.price.toLocaleString()}
                  <span className="text-sm text-white/50 font-normal">/月</span>
                </div>
              </div>
              {selectedPlan === 'monthly' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>

            {/* 年額 */}
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                selectedPlan === 'yearly'
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <div className="absolute -top-3 right-4">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                  2ヶ月分お得
                </span>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white mb-1">年額プラン</h3>
                <div className="text-3xl font-bold text-white">
                  ¥{PLANS.yearly.price.toLocaleString()}
                  <span className="text-sm text-white/50 font-normal">/年</span>
                </div>
                <p className="text-sm text-green-400 mt-1">
                  月額 ¥{Math.round(PLANS.yearly.price / 12).toLocaleString()} 相当
                </p>
              </div>
              {selectedPlan === 'yearly' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 決済ボタン */}
        <div className="text-center">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-2xl hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-pink-500/30"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                処理中...
              </>
            ) : (
              <>
                <Zap className="h-6 w-6 mr-3" />
                今すぐアップグレード
                <ArrowRight className="h-6 w-6 ml-3" />
              </>
            )}
          </button>
          
          <p className="text-sm text-white/50 mt-4 flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" />
            安全なStripe決済
          </p>
        </div>

        {/* メリット */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">無制限のモデル登録</h3>
            <p className="text-white/60 text-sm">何人でもモデルを追加して一元管理</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">データ無期限保存</h3>
            <p className="text-white/60 text-sm">長期トレンド分析で成長を可視化</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI収益提案</h3>
            <p className="text-white/60 text-sm">データに基づく最適化アドバイス</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            よくある質問
          </h2>
          
          <div className="space-y-6 max-w-2xl mx-auto">
            <div>
              <h3 className="font-bold text-white mb-2">
                いつでもキャンセルできますか？
              </h3>
              <p className="text-white/60">
                はい、いつでもキャンセル可能です。キャンセル後も現在の期間が終了するまでプロ機能をご利用いただけます。
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">
                無料プランのデータは引き継がれますか？
              </h3>
              <p className="text-white/60">
                はい、すべてのデータはそのまま引き継がれます。アップグレード後すぐにすべての機能をお使いいただけます。
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">
                返金は可能ですか？
              </h3>
              <p className="text-white/60">
                初回購入から7日以内であれば、全額返金いたします。お気軽にお試しください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
