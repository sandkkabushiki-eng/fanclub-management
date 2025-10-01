import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// サーバーサイド用Supabaseクライアント（service role key使用）
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

// クライアントサイド用Supabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aksptiaptxogdipuysut.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTIzMjMsImV4cCI6MjA3NDE4ODMyM30.56TBLIIvYIk5R4Moyhe2PluQMTq7gZ51suXFesrkULA'
);

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subscription_status?: string;
  subscription_expires_at?: string;
}

// サーバーサイドでユーザー情報を取得
export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return null;
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user) {
      return null;
    }

    // ユーザー情報をusersテーブルから取得
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    // サブスクリプション情報を取得
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    return {
      id: user.id,
      email: user.email!,
      name: userData.name,
      role: userData.role,
      subscription_status: subscription?.status,
      subscription_expires_at: subscription?.current_period_end,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// 管理者権限チェック
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
  
  return user;
}

// ログイン必須チェック
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

// 有料プラン必須チェック
export async function requireSubscription(): Promise<User> {
  const user = await requireAuth();
  
  if (user.role !== 'admin' && user.subscription_status !== 'active') {
    redirect('/dashboard?upgrade=true');
  }
  
  return user;
}

// クライアントサイドでユーザー情報を取得
export async function getClientUser(): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !userData) {
      return null;
    }

    // サブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    return {
      id: session.user.id,
      email: session.user.email!,
      name: userData.name,
      role: userData.role,
      subscription_status: subscription?.status,
      subscription_expires_at: subscription?.current_period_end,
    };
  } catch (error) {
    console.error('Error getting client user:', error);
    return null;
  }
}

// セッション管理
export async function signOut() {
  await supabase.auth.signOut();
  redirect('/login');
}

