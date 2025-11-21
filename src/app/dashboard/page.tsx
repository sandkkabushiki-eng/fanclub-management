import { requireAuth } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';
import { Crown, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// 環境変数の検証
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase環境変数が設定されていません');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth();
  
  // サブスクリプション情報を取得
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const isActive = subscription?.status === 'active';
  const isAdmin = user.role === 'admin';

  // アップグレードが必要な場合のリダイレクト
  const resolvedSearchParams = await searchParams;
  const upgradeRequired = resolvedSearchParams.upgrade === 'true';
  if (upgradeRequired && !isActive && !isAdmin) {
    // アップグレードページにリダイレクト
    redirect('/upgrade');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            ようこそ、{user.name}さん
          </p>
        </div>

        {/* サブスクリプション状況 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 現在のプラン */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                現在のプラン
              </h2>
              {isAdmin && (
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  管理者
                </span>
              )}
            </div>
            
            {isActive ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">プレミアムプラン</p>
                <p className="text-sm text-gray-600">
                  期限: {subscription?.current_period_end 
                    ? new Date(subscription.current_period_end).toLocaleDateString('ja-JP')
                    : '不明'
                  }
                </p>
                <p className="text-sm text-green-600 font-medium">✓ 全機能利用可能</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-600">無料プラン</p>
                <p className="text-sm text-gray-600">基本的な機能のみ利用可能</p>
                <p className="text-sm text-orange-600 font-medium">⚠️ 制限あり</p>
              </div>
            )}
          </div>

          {/* アクション */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
              アクション
            </h2>
            
            <div className="space-y-3">
              {isActive ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">サブスクリプション管理</p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    サブスクリプション管理
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">プレミアム機能を利用する</p>
                  <a 
                    href="/upgrade"
                    className="w-full inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-center"
                  >
                    アップグレード
                  </a>
                </div>
              )}
              
              {isAdmin && (
                <a 
                  href="/admin"
                  className="w-full inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
                >
                  管理者ダッシュボード
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 機能アクセス */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            利用可能な機能
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV分析機能 */}
            <div className={`p-4 rounded-lg border-2 ${
              isActive || isAdmin 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">CSV分析</h3>
                {isActive || isAdmin ? (
                  <span className="text-green-600 text-sm font-medium">✓ 利用可能</span>
                ) : (
                  <span className="text-gray-500 text-sm font-medium">⚠️ 制限あり</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                売上データの詳細分析とレポート生成
              </p>
              <a 
                href="/analytics"
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  isActive || isAdmin
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isActive || isAdmin ? '利用する' : 'プレミアムが必要'}
              </a>
            </div>

            {/* データ管理機能 */}
            <div className={`p-4 rounded-lg border-2 ${
              isActive || isAdmin 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">データ管理</h3>
                {isActive || isAdmin ? (
                  <span className="text-green-600 text-sm font-medium">✓ 利用可能</span>
                ) : (
                  <span className="text-gray-500 text-sm font-medium">⚠️ 制限あり</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                モデルデータの管理と編集
              </p>
              <Link 
                href="/"
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  isActive || isAdmin
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isActive || isAdmin ? '利用する' : 'プレミアムが必要'}
              </Link>
            </div>
          </div>
        </div>

        {/* アップグレード案内 */}
        {!isActive && !isAdmin && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-purple-600 mt-1 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  プレミアムプランでより多くの機能を
                </h3>
                <p className="text-purple-700 mb-4">
                  プレミアムプランにアップグレードすると、高度な分析機能、データ管理機能、
                  優先サポートなど、すべての機能にアクセスできます。
                </p>
                <a 
                  href="/upgrade"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  今すぐアップグレード
                </a>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {subscriptionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              サブスクリプション情報の取得中にエラーが発生しました。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

