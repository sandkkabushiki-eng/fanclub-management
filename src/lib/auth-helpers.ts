import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// 環境変数の検証
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL環境変数が設定されていません');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY環境変数が設定されていません');
}

// サーバーサイド用Supabaseクライアント（service role key使用）
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// クライアントサイド用Supabaseクライアント
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
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

