import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 使用量統計API（管理者用）
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.user.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');
    
    let query = supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // 集計データを計算
    const summary = data.reduce((acc, item) => {
      acc.totalDataTransfer += item.data_transfer_bytes || 0;
      acc.totalApiCalls += item.api_calls_count || 0;
      acc.totalStorage += item.storage_bytes || 0;
      return acc;
    }, {
      totalDataTransfer: 0,
      totalApiCalls: 0,
      totalStorage: 0,
      days: data.length
    });
    
    return createSuccessResponse({
      summary,
      dailyUsage: data,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Usage stats error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// プラン制限チェックAPI
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { userId } = auth;
    const { dataSize, apiCalls } = await request.json();
    
    const planCheck = await checkPlanLimits(userId, dataSize || 0);
    
    return createSuccessResponse({
      allowed: planCheck.allowed,
      reason: planCheck.reason,
      currentUsage: await getUserUsage(userId)
    });
    
  } catch (error) {
    console.error('Plan check error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// ユーザー使用量取得
async function getUserUsage(userId: string) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('plan, data_usage_bytes, api_calls_count')
      .eq('id', userId)
      .single();
    
    if (!user) return null;
    
    const planLimits = {
      free: { dataTransfer: 100 * 1024 * 1024, apiCalls: 1000 },
      basic: { dataTransfer: 1024 * 1024 * 1024, apiCalls: 10000 },
      pro: { dataTransfer: 10 * 1024 * 1024 * 1024, apiCalls: 100000 },
      enterprise: { dataTransfer: 100 * 1024 * 1024 * 1024, apiCalls: 1000000 },
    };
    
    const limits = planLimits[user.plan as keyof typeof planLimits] || planLimits.free;
    
    return {
      plan: user.plan,
      dataUsage: {
        current: user.data_usage_bytes,
        limit: limits.dataTransfer,
        percentage: Math.round((user.data_usage_bytes / limits.dataTransfer) * 100)
      },
      apiCalls: {
        current: user.api_calls_count,
        limit: limits.apiCalls,
        percentage: Math.round((user.api_calls_count / limits.apiCalls) * 100)
      }
    };
  } catch (error) {
    console.error('Get user usage error:', error);
    return null;
  }
}

// 認証ヘルパー（簡略版）
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return { userId: user.id, user };
  } catch (error) {
    return null;
  }
}

// プラン制限チェック（簡略版）
async function checkPlanLimits(userId: string, dataSize: number) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('plan, data_usage_bytes')
      .eq('id', userId)
      .single();
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    const planLimits = {
      free: { dataTransfer: 100 * 1024 * 1024 },
      basic: { dataTransfer: 1024 * 1024 * 1024 },
      pro: { dataTransfer: 10 * 1024 * 1024 * 1024 },
      enterprise: { dataTransfer: 100 * 1024 * 1024 * 1024 },
    };
    
    const limits = planLimits[user.plan as keyof typeof planLimits] || planLimits.free;
    
    if (user.data_usage_bytes + dataSize > limits.dataTransfer) {
      return { allowed: false, reason: 'Data transfer limit exceeded' };
    }
    
    return { allowed: true };
  } catch (error) {
    return { allowed: false, reason: 'Internal error' };
  }
}

// レスポンスヘルパー（簡略版）
function createSuccessResponse(data: any) {
  return NextResponse.json({ success: true, data });
}

function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

