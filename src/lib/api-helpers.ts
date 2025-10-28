import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Supabaseクライアント（最適化版）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    },
  }
);

// レート制限用のメモリキャッシュ（本番ではRedisを使用推奨）
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// レート制限チェック
function checkRateLimit(userId: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `${userId}:${Math.floor(now / windowMs)}`;
  
  const current = rateLimitCache.get(key);
  if (!current || now > current.resetTime) {
    rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

// 使用量追跡
async function trackUsage(userId: string, dataSize: number, apiCall: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 日別使用量を更新
    await supabaseAdmin
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        date: today,
        data_transfer_bytes: dataSize,
        api_calls_count: 1,
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      });
    
    // ユーザーの総使用量を更新
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('data_usage_bytes, api_calls_count')
      .eq('id', userId)
      .single();
    
    if (currentUser) {
      await supabaseAdmin
        .from('users')
        .update({
          data_usage_bytes: (currentUser.data_usage_bytes || 0) + dataSize,
          api_calls_count: (currentUser.api_calls_count || 0) + 1,
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Usage tracking error:', error);
  }
}

// プラン制限チェック
async function checkPlanLimits(userId: string, dataSize: number): Promise<{ allowed: boolean; reason?: string }> {
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
      free: { dataTransfer: 100 * 1024 * 1024, apiCalls: 1000 }, // 100MB, 1000 calls
      basic: { dataTransfer: 1024 * 1024 * 1024, apiCalls: 10000 }, // 1GB, 10k calls
      pro: { dataTransfer: 10 * 1024 * 1024 * 1024, apiCalls: 100000 }, // 10GB, 100k calls
      enterprise: { dataTransfer: 100 * 1024 * 1024 * 1024, apiCalls: 1000000 }, // 100GB, 1M calls
    };
    
    const limits = planLimits[user.plan as keyof typeof planLimits] || planLimits.free;
    
    if (user.data_usage_bytes + dataSize > limits.dataTransfer) {
      return { allowed: false, reason: 'Data transfer limit exceeded' };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Plan limit check error:', error);
    return { allowed: false, reason: 'Internal error' };
  }
}

// 共通のAPIレスポンスヘルパー
export function createApiResponse(data: any, status: number = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...headers,
    },
  });
}

// エラーレスポンス
export function createErrorResponse(message: string, status: number = 400) {
  return createApiResponse({ error: message }, status);
}

// 成功レスポンス
export function createSuccessResponse(data: any, status: number = 200) {
  return createApiResponse({ success: true, data }, status);
}

// 認証ミドルウェア
export async function authenticateRequest(request: NextRequest): Promise<{ userId: string; user: any } | null> {
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
    console.error('Authentication error:', error);
    return null;
  }
}

// API使用量追跡ミドルウェア
export async function trackApiUsage(userId: string, request: NextRequest, response: NextResponse) {
  try {
    const contentLength = request.headers.get('content-length');
    const dataSize = contentLength ? parseInt(contentLength) : 0;
    
    await trackUsage(userId, dataSize, request.url);
  } catch (error) {
    console.error('API usage tracking error:', error);
  }
}

export { checkRateLimit, checkPlanLimits, trackUsage };
