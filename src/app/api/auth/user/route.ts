import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Supabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    });

    // セッションからユーザーを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // Cookieから直接トークンを取得してみる
      const accessToken = cookieStore.get('sb-access-token')?.value;
      const refreshToken = cookieStore.get('sb-refresh-token')?.value;
      
      if (accessToken && refreshToken) {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (user && !error) {
          return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
          });
        }
      }
      
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = session.user;
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0],
    });

  } catch (error) {
    console.error('Auth user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

