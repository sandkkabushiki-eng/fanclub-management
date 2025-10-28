import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  authenticateRequest, 
  createSuccessResponse, 
  createErrorResponse, 
  checkRateLimit, 
  checkPlanLimits,
  trackApiUsage 
} from '@/lib/api-helpers';

// Supabaseクライアントの初期化（環境変数チェック付き）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase環境変数が設定されていません');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// 月別データの保存（最適化版）
export async function POST(request: NextRequest) {
  try {
    // Supabaseクライアントの確認
    if (!supabaseAdmin) {
      return createErrorResponse('Database connection not available', 500);
    }

    // 認証チェック
    const auth = await authenticateRequest(request);
    if (!auth) {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { userId } = auth;
    
    // レート制限チェック
    if (!checkRateLimit(userId, 50, 60000)) { // 1分間に50回まで
      return createErrorResponse('Rate limit exceeded', 429);
    }
    
    const { modelId, modelName, year, month, data } = await request.json();
    
    if (!modelId || !modelName || !year || !month || !Array.isArray(data)) {
      return createErrorResponse('Invalid request data', 400);
    }
    
    // データサイズチェック
    const dataSize = JSON.stringify(data).length;
    const planCheck = await checkPlanLimits(userId, dataSize);
    
    if (!planCheck.allowed) {
      return createErrorResponse(planCheck.reason || 'Plan limit exceeded', 403);
    }
    
    // 分析データの軽量化
    const analysis = analyzeFanClubRevenue(data);
    const lightweightAnalysis = {
      totalRevenue: analysis.totalRevenue,
      totalCustomers: analysis.totalCustomers,
      averageRevenuePerCustomer: analysis.averageRevenuePerCustomer,
      topCustomers: analysis.topCustomers.slice(0, 5),
      monthlyTrend: analysis.monthlyTrend,
      peakHours: analysis.peakHours.slice(0, 3)
    };
    
    // 既存データのチェック
    const { data: existingData } = await supabaseAdmin
      .from('monthly_data')
      .select('id')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .eq('year', year)
      .eq('month', month)
      .single();
    
    const monthlyData = {
      user_id: userId,
      model_id: modelId,
      year,
      month,
      data,
      analysis: lightweightAnalysis,
      data_size_bytes: dataSize,
      updated_at: new Date().toISOString()
    };
    
    let result;
    if (existingData) {
      // 更新
      const { data: updatedData, error } = await supabaseAdmin
        .from('monthly_data')
        .update(monthlyData)
        .eq('id', existingData.id)
        .select()
        .single();
      
      if (error) throw error;
      result = updatedData;
    } else {
      // 新規作成
      const { data: newData, error } = await supabaseAdmin
        .from('monthly_data')
        .insert({
          ...monthlyData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      result = newData;
    }
    
    // 使用量追跡
    await trackApiUsage(userId, request, createSuccessResponse(result));
    
    return createSuccessResponse(result);
    
  } catch (error) {
    console.error('Monthly data save error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// 月別データの取得（最適化版）
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { userId } = auth;
    
    // レート制限チェック
    if (!checkRateLimit(userId, 100, 60000)) {
      return createErrorResponse('Rate limit exceeded', 429);
    }
    
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    let query = supabaseAdmin
      .from('monthly_data')
      .select('id, model_id, year, month, analysis, created_at, updated_at')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (modelId) {
      query = query.eq('model_id', modelId);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (month) {
      query = query.eq('month', parseInt(month));
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // 使用量追跡
    await trackApiUsage(userId, request, createSuccessResponse(data));
    
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('Monthly data fetch error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// 月別データの削除
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { userId } = auth;
    
    if (!checkRateLimit(userId, 20, 60000)) {
      return createErrorResponse('Rate limit exceeded', 429);
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return createErrorResponse('ID is required', 400);
    }
    
    const { error } = await supabaseAdmin
      .from('monthly_data')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    await trackApiUsage(userId, request, createSuccessResponse({ deleted: true }));
    
    return createSuccessResponse({ deleted: true });
    
  } catch (error) {
    console.error('Monthly data delete error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// 分析関数（軽量化版）
function analyzeFanClubRevenue(data: any[]) {
  const totalRevenue = data.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCustomers = new Set(data.map(item => item.customerId)).size;
  const averageRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  // 上位顧客（軽量化）
  const customerTotals = data.reduce((acc, item) => {
    const id = item.customerId;
    acc[id] = (acc[id] || 0) + (item.amount || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const topCustomers = Object.entries(customerTotals)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([id, amount]) => ({ customerId: id, totalAmount: amount }));
  
  // 月別トレンド（簡略化）
  const monthlyTrend = data.reduce((acc, item) => {
    const month = new Date(item.date).getMonth();
    acc[month] = (acc[month] || 0) + (item.amount || 0);
    return acc;
  }, {} as Record<number, number>);
  
  // ピーク時間（簡略化）
  const peakHours = data.reduce((acc, item) => {
    const hour = new Date(item.date).getHours();
    acc[hour] = (acc[hour] || 0) + (item.amount || 0);
    return acc;
  }, {} as Record<number, number>);
  
  return {
    totalRevenue,
    totalCustomers,
    averageRevenuePerCustomer,
    topCustomers,
    monthlyTrend,
    peakHours: Object.entries(peakHours)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([hour, amount]) => ({ hour: parseInt(hour), amount }))
  };
}
