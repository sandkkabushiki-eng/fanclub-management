import { requireSubscription } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

// 環境変数の検証
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase環境変数が設定されていません');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function AnalyticsPage() {
  const user = await requireSubscription();

  // ユーザーのモデルデータを取得
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // ユーザーの月別データを取得
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('monthly_data')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 統計データを計算
  const totalModels = models?.length || 0;
  const totalRecords = monthlyData?.length || 0;
  
  // 総売上を計算
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue = monthlyData?.reduce((sum: number, record: any) => {
    if (Array.isArray(record.data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sum + record.data.reduce((recordSum: number, item: any) => {
        return recordSum + (Number(item.金額) || 0);
      }, 0);
    }
    return sum;
  }, 0) || 0;

  // 月別売上データを準備
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyRevenue = monthlyData?.reduce((acc: any, record: any) => {
    const key = `${record.year}-${record.month}`;
    const monthRevenue = Array.isArray(record.data) 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? record.data.reduce((sum: number, item: any) => sum + (Number(item.金額) || 0), 0)
      : 0;
    
    if (!acc[key]) {
      acc[key] = {
        month: `${record.year}年${record.month}月`,
        revenue: 0,
        records: 0
      };
    }
    acc[key].revenue += monthRevenue;
    acc[key].records += 1;
    
    return acc;
  }, {} as Record<string, { month: string; revenue: number; records: number }>) || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyRevenueArray = Object.values(monthlyRevenue).sort((a: any, b: any) => 
    b.month.localeCompare(a.month)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-purple-600" />
            売上分析
          </h1>
          <p className="text-gray-600 mt-2">
            {user.name}さんのデータ分析結果
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
                  ¥{totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">モデル数</p>
                <p className="text-2xl font-bold text-gray-900">{totalModels}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">データ記録数</p>
                <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均売上/月</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{totalRecords > 0 ? Math.round(totalRevenue / totalRecords).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 月別売上推移 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              月別売上推移
            </h2>
            <div className="space-y-4">
              {monthlyRevenueArray.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                monthlyRevenueArray.slice(0, 6).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{item.month}</p>
                      <p className="text-sm text-gray-600">{item.records}件の記録</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ¥{item.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">売上データがありません</p>
              )}
            </div>
          </div>

          {/* モデル一覧 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              モデル一覧
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {models && models.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                models.map((model: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{model.display_name}</p>
                      <p className="text-sm text-gray-600">
                        作成日: {new Date(model.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {model.status === 'active' ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">モデルデータがありません</p>
              )}
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {(modelsError || monthlyError) && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              データの取得中にエラーが発生しました。もう一度お試しください。
            </p>
          </div>
        )}

        {/* アクション */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            データ管理に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

