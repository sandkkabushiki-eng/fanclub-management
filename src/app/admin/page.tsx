import { requireAdmin } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aksptiaptxogdipuysut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMjMyMywiZXhwIjoyMDc0MTg4MzIzfQ.EpJsXq17uDoqlr7rP0HY4yv0zSEhS9OiCGgHTHFHHmI',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface RevenueData {
  month: string;
  transaction_count: number;
  total_revenue_cents: number;
  unique_customers: number;
}

interface SubscriptionData {
  user_id: string;
  email: string;
  name: string;
  subscription_status: string;
  current_period_end: string;
  created_at: string;
}

export default async function AdminPage() {
  const user = await requireAdmin();

  // 売上データを取得
  const { data: revenueData, error: revenueError } = await supabaseAdmin
    .rpc('get_revenue_summary');

  // アクティブサブスクリプションを取得
  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .rpc('get_active_subscriptions');

  // 総売上を計算
  const totalRevenue = revenueData?.reduce((sum: number, item: RevenueData) => sum + item.total_revenue_cents, 0) || 0;
  const totalCustomers = subscriptions?.length || 0;
  const activeSubscriptions = subscriptions?.filter((sub: SubscriptionData) => sub.subscription_status === 'active').length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            ようこそ、{user.name}さん。システム全体の売上とサブスクリプション状況を確認できます。
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{Math.round(totalRevenue / 100).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総顧客数</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">アクティブサブスク</p>
                <p className="text-2xl font-bold text-gray-900">{activeSubscriptions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">今月の取引</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueData?.[0]?.transaction_count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 売上推移 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              月別売上推移
            </h2>
            <div className="space-y-4">
              {revenueData && revenueData.length > 0 ? (
                revenueData.slice(0, 6).map((item: RevenueData, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(item.month).toLocaleDateString('ja-JP', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.unique_customers}名の顧客
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ¥{Math.round(item.total_revenue_cents / 100).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.transaction_count}件
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">売上データがありません</p>
              )}
            </div>
          </div>

          {/* アクティブサブスクリプション */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              アクティブサブスクリプション
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {subscriptions && subscriptions.length > 0 ? (
                subscriptions.map((sub: SubscriptionData, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{sub.name}</p>
                      <p className="text-sm text-gray-600">{sub.email}</p>
                      <p className="text-xs text-gray-500">
                        登録日: {new Date(sub.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sub.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sub.subscription_status === 'active' ? 'アクティブ' : 'その他'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        期限: {new Date(sub.current_period_end).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">アクティブなサブスクリプションがありません</p>
              )}
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {(revenueError || subscriptionsError) && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              データの取得中にエラーが発生しました。管理者にお問い合わせください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}