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

// システム監視API
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.user.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    
    switch (type) {
      case 'overview':
        return await getSystemOverview();
      case 'users':
        return await getUserStats();
      case 'usage':
        return await getUsageStats();
      case 'alerts':
        return await getAlerts();
      default:
        return createErrorResponse('Invalid type parameter', 400);
    }
    
  } catch (error) {
    console.error('Monitoring API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// システム概要
async function getSystemOverview() {
  try {
    // ユーザー統計
    const { data: userStats } = await supabaseAdmin
      .from('users')
      .select('plan, status, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    // 使用量統計
    const { data: usageStats } = await supabaseAdmin
      .from('usage_tracking')
      .select('data_transfer_bytes, api_calls_count')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    // データベースサイズ
    const { data: dbStats } = await supabaseAdmin
      .from('monthly_data')
      .select('data_size_bytes')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const overview = {
      users: {
        total: userStats?.length || 0,
        byPlan: userStats?.reduce((acc, user) => {
          acc[user.plan] = (acc[user.plan] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
        active: userStats?.filter(u => u.status === 'active').length || 0
      },
      usage: {
        totalDataTransfer: usageStats?.reduce((sum, u) => sum + (u.data_transfer_bytes || 0), 0) || 0,
        totalApiCalls: usageStats?.reduce((sum, u) => sum + (u.api_calls_count || 0), 0) || 0,
        avgDataTransfer: usageStats?.length ? 
          usageStats.reduce((sum, u) => sum + (u.data_transfer_bytes || 0), 0) / usageStats.length : 0
      },
      storage: {
        totalSize: dbStats?.reduce((sum, d) => sum + (d.data_size_bytes || 0), 0) || 0,
        records: dbStats?.length || 0
      },
      alerts: await generateAlerts()
    };
    
    return createSuccessResponse(overview);
    
  } catch (error) {
    console.error('System overview error:', error);
    throw error;
  }
}

// ユーザー統計
async function getUserStats() {
  try {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, status, created_at, last_login_at, data_usage_bytes, api_calls_count')
      .order('created_at', { ascending: false });
    
    const stats = {
      total: users?.length || 0,
      active: users?.filter(u => u.status === 'active').length || 0,
      byPlan: users?.reduce((acc, user) => {
        acc[user.plan] = (acc[user.plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      topUsers: users?.sort((a, b) => (b.data_usage_bytes || 0) - (a.data_usage_bytes || 0)).slice(0, 10) || [],
      recentSignups: users?.filter(u => 
        new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0
    };
    
    return createSuccessResponse(stats);
    
  } catch (error) {
    console.error('User stats error:', error);
    throw error;
  }
}

// 使用量統計
async function getUsageStats() {
  try {
    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    const stats = {
      daily: usage || [],
      summary: {
        totalDataTransfer: usage?.reduce((sum, u) => sum + (u.data_transfer_bytes || 0), 0) || 0,
        totalApiCalls: usage?.reduce((sum, u) => sum + (u.api_calls_count || 0), 0) || 0,
        avgDailyDataTransfer: usage?.length ? 
          usage.reduce((sum, u) => sum + (u.data_transfer_bytes || 0), 0) / usage.length : 0,
        avgDailyApiCalls: usage?.length ? 
          usage.reduce((sum, u) => sum + (u.api_calls_count || 0), 0) / usage.length : 0
      },
      trends: {
        dataTransferTrend: calculateTrend(usage?.map(u => u.data_transfer_bytes || 0) || []),
        apiCallsTrend: calculateTrend(usage?.map(u => u.api_calls_count || 0) || [])
      }
    };
    
    return createSuccessResponse(stats);
    
  } catch (error) {
    console.error('Usage stats error:', error);
    throw error;
  }
}

// アラート生成
async function generateAlerts() {
  try {
    const alerts = [];
    
    // 高使用量ユーザーのチェック
    const { data: highUsageUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, data_usage_bytes, api_calls_count')
      .gt('data_usage_bytes', 50 * 1024 * 1024); // 50MB以上
    
    if (highUsageUsers && highUsageUsers.length > 0) {
      alerts.push({
        type: 'high_usage',
        severity: 'warning',
        message: `${highUsageUsers.length} users exceeding 50MB data usage`,
        users: highUsageUsers.map(u => ({ id: u.id, email: u.email, usage: u.data_usage_bytes }))
      });
    }
    
    // 非アクティブユーザーのチェック
    const { data: inactiveUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, last_login_at')
      .lt('last_login_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (inactiveUsers && inactiveUsers.length > 0) {
      alerts.push({
        type: 'inactive_users',
        severity: 'info',
        message: `${inactiveUsers.length} users inactive for 30+ days`,
        count: inactiveUsers.length
      });
    }
    
    // システム負荷チェック
    const { data: recentUsage } = await supabaseAdmin
      .from('usage_tracking')
      .select('data_transfer_bytes, api_calls_count')
      .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    const totalDataTransfer = recentUsage?.reduce((sum, u) => sum + (u.data_transfer_bytes || 0), 0) || 0;
    const totalApiCalls = recentUsage?.reduce((sum, u) => sum + (u.api_calls_count || 0), 0) || 0;
    
    if (totalDataTransfer > 1024 * 1024 * 1024) { // 1GB以上
      alerts.push({
        type: 'high_data_transfer',
        severity: 'critical',
        message: `High data transfer: ${Math.round(totalDataTransfer / 1024 / 1024)}MB in last 24h`,
        value: totalDataTransfer
      });
    }
    
    if (totalApiCalls > 100000) { // 10万回以上
      alerts.push({
        type: 'high_api_calls',
        severity: 'warning',
        message: `High API usage: ${totalApiCalls} calls in last 24h`,
        value: totalApiCalls
      });
    }
    
    return alerts;
    
  } catch (error) {
    console.error('Alert generation error:', error);
    return [];
  }
}

// アラート取得
async function getAlerts() {
  try {
    const alerts = await generateAlerts();
    return createSuccessResponse(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    throw error;
  }
}

// トレンド計算
function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'stable';
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

// レスポンスヘルパー（簡略版）
function createSuccessResponse(data: any) {
  return NextResponse.json({ success: true, data });
}

function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

