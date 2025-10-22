import { createClient } from '@supabase/supabase-js';
import { User, AuthSession, LoginCredentials, RegisterData } from '@/types/auth';

// Supabase設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aksptiaptxogdipuysut.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTIzMjMsImV4cCI6MjA3NDE4ODMyM30.56TBLIIvYIk5R4Moyhe2PluQMTq7gZ51suXFesrkULA';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMjMyMywiZXhwIjoyMDc0MTg4MzIzfQ.EpJsXq17uDoqlr7rP0HY4yv0zSEhS9OiCGgHTHFHHmI';

// OAuth設定
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Supabaseクライアント（シングルトンパターンで重複を防ぐ）
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return _supabase;
})();

export const supabaseAdmin = (() => {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
})();

// Supabase接続テスト
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', SUPABASE_URL);
    console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    // 基本的な接続テスト
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ユーザー専用のSupabaseクライアント（動的に生成）
export const createUserSupabase = (userId: string) => {
  // ユーザー専用のデータベーススキーマを使用
  const userSupabaseUrl = `${SUPABASE_URL}/rest/v1/`;
  const userSupabaseKey = generateUserToken(userId);
  
  return createClient(userSupabaseUrl, userSupabaseKey, {
    db: {
      schema: `user_${userId}`
    }
  });
};

// パスワードハッシュ化（現在はSupabase Authを使用するため未使用）
// function hashPassword(password: string): string {
//   return CryptoJS.SHA256(password).toString();
// }

// パスワード検証（現在はSupabase Authを使用するため未使用）
// function verifyPassword(password: string, hashedPassword: string): boolean {
//   return hashPassword(password) === hashedPassword;
// }

// ユーザートークン生成（簡易版）
function generateUserToken(userId: string): string {
  // 実際の実装では、よりセキュアなJWTトークンを使用
  return btoa(`user_${userId}_${Date.now()}`);
}

// 認証状態管理
class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private session: AuthSession | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // 管理者認証
  async adminLogin(adminPassword: string): Promise<AuthSession | null> {
    try {
      // 管理者の認証（実際の実装ではSupabase Authを使用）
      if (adminPassword === 'admin123') {
        const user: User = {
          id: 'admin',
          email: 'admin@fanclub.com',
          name: 'システム管理者',
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
          subscription: {
            plan: 'enterprise' as const,
            status: 'active' as const,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        };

        const session: AuthSession = {
          user,
          token: generateUserToken('admin'),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間
        };

        this.currentUser = user;
        this.session = session;
        this.saveSession(session);

        return session;
      }
      return null;
    } catch (error) {
      console.error('Admin login error:', error);
      return null;
    }
  }

  // ユーザー認証（Supabase Auth使用）
  async userLogin(credentials: LoginCredentials): Promise<AuthSession | null> {
    try {
      console.log('Attempting login for:', credentials.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('Login error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        return null;
      }

      console.log('Login successful, user data:', {
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at
      });

      if (data.user && data.session) {
        // ユーザー情報はトリガーで自動的に作成される

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || 'ユーザー',
          role: 'user' as 'admin' | 'user',
          createdAt: data.user.created_at,
          lastLoginAt: new Date().toISOString(),
          isActive: true,
          subscription: {
            plan: 'basic' as const,
            status: 'active' as const,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        };

        // 最終ログイン時刻の更新はトリガーで処理

        const session: AuthSession = {
          user,
          token: data.session.access_token,
          expiresAt: new Date((data.session.expires_at || Date.now() / 1000 + 24 * 60 * 60) * 1000).toISOString()
        };

        this.currentUser = user;
        this.session = session;
        this.saveSession(session);

        return session;
      }

      return null;
    } catch (error) {
      console.error('User login error:', error);
      return null;
    }
  }

  // ユーザー登録（Supabase Auth使用）
  async registerUser(data: RegisterData): Promise<AuthSession | null> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
          // 開発用: メール確認を無効化
          emailRedirectTo: undefined
        }
      });

      if (error) {
        console.error('Registration error:', error);
        // より詳細なエラー情報を提供
        console.log('Supabase registration error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        // より具体的なエラーメッセージ
        if (error.message.includes('already registered')) {
          throw new Error('このメールアドレスは既に登録されています');
        } else if (error.message.includes('password')) {
          throw new Error('パスワードの要件を満たしていません');
        } else {
          throw new Error(`登録エラー: ${error.message}`);
        }
      }

      if (authData.user) {
        // ユーザー情報はSupabaseのトリガーで自動的に作成される
        console.log('User created successfully, trigger will handle user data insertion');

        // 確認メール送信後の処理
        if (authData.session) {
          // 確認不要の場合は即座にログイン
          const user: User = {
            id: authData.user.id,
            email: data.email,
            name: data.name,
            role: 'user',
            createdAt: authData.user.created_at,
            lastLoginAt: new Date().toISOString(),
            isActive: true,
            subscription: {
              plan: 'basic' as const,
              status: 'active' as const,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          };

          const session: AuthSession = {
            user,
            token: authData.session.access_token,
            expiresAt: new Date((authData.session.expires_at || Date.now() / 1000 + 24 * 60 * 60) * 1000).toISOString()
          };

          this.currentUser = user;
          this.session = session;
          this.saveSession(session);

          return session;
        } else {
          // 確認メール送信の場合
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('User registration error:', error);
      
      // Supabaseが使えない場合（オフライン時）は、メール送信完了として扱う
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch')
      )) {
        console.log('Supabase is offline, treating as email sent successfully');
        // オフライン時は成功として扱う（メール送信完了メッセージを表示）
        return null;
      }
      
      return null;
    }
  }

  // ユーザー専用スキーマ作成（現在は使用していない）
  // private async createUserSchema(userId: string): Promise<void> {
  //   // この関数は現在使用していない
  // }

  // セッション保存
  private saveSession(session: AuthSession): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fanclub-session', JSON.stringify(session));
    }
  }

  // セッション復元
  async loadSession(): Promise<AuthSession | null> {
    if (typeof window === 'undefined') return null;

    try {
      console.log('🔍 Supabaseセッション確認中...');
      
      // まずSupabaseのセッションを確認（タイムアウト付き）
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Supabase session timeout')), 1500);
      });
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any }, error: any };
      const { data: { session: supabaseSession }, error } = result;
      
      if (error) {
        console.warn('Supabase session error:', error.message);
        // エラーが発生した場合はローカルセッションをクリア
        this.logout();
        return null;
      }

      if (supabaseSession) {
        console.log('✅ Supabaseセッションが見つかりました');
        // Supabaseセッションが有効な場合
        const authSession: AuthSession = {
          user: {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email || '',
            name: supabaseSession.user.user_metadata?.name || supabaseSession.user.email || '',
            role: 'user'
          },
          expiresAt: new Date(supabaseSession.expires_at! * 1000).toISOString(),
          accessToken: supabaseSession.access_token
        };
        
        this.currentUser = authSession.user;
        sessionStorage.setItem('fanclub-session', JSON.stringify(authSession));
        return authSession;
      }

      console.log('❌ Supabaseセッションが見つかりませんでした');
      // Supabaseセッションがない場合はローカルセッションを確認
      const sessionData = sessionStorage.getItem('fanclub-session');
      if (!sessionData) {
        console.log('❌ ローカルセッションも見つかりませんでした');
        return null;
      }

      const session = JSON.parse(sessionData) as AuthSession;
      
      // セッションの有効期限チェック
      if (new Date(session.expiresAt) < new Date()) {
        console.log('⏰ セッションの有効期限が切れています');
        this.logout();
        return null;
      }

      console.log('✅ ローカルセッションが見つかりました');
      this.currentUser = session.user;
      this.session = session;
      return session;
    } catch (error) {
      console.error('Session load error:', error);
      this.logout();
      return null;
    }
  }

  // ログアウト
  async logout(): Promise<void> {
    try {
      // Supabaseからもログアウト
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase logout error:', error);
    }
    
    this.currentUser = null;
    this.session = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fanclub-session');
      localStorage.removeItem('fanclub-session');
    }
  }

  // 現在のユーザー取得
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 現在のセッション取得
  getCurrentSession(): AuthSession | null {
    return this.session;
  }

  // 管理者チェック
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // ユーザーアクティブチェック
  isUserActive(): boolean {
    return this.currentUser?.isActive === true;
  }

  // 最終ログイン更新（現在は使用していない）
  // private async updateLastLogin(userId: string): Promise<void> {
  //   // この関数は現在使用していない
  // }

  // ユーザー情報を取得または作成（現在は使用していない）
  // private async getOrCreateUserData(supabaseUser: { id: string; email: string; user_metadata?: { name?: string } }): Promise<{ name: string; role: string; subscription: { plan: string; status: string; expiresAt: string } } | null> {
  //   // この関数は現在使用していない（トリガーで処理）
  // }

  // Google OAuth認証
  async googleLogin(): Promise<AuthSession | null> {
    try {
      // Google OAuth認証を開始
      if (typeof window === 'undefined') return null;
      
      // Google OAuth認証のリダイレクトURLを生成
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'openid email profile';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline`;
      
      // 認証ページにリダイレクト
      window.location.href = authUrl;
      
      return null; // リダイレクトするため
    } catch (error) {
      console.error('Google login error:', error);
      return null;
    }
  }

  // X (Twitter) OAuth認証
  async xLogin(): Promise<AuthSession | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      // X OAuth認証のリダイレクトURLを生成（将来の実装用）
      // const redirectUri = `${window.location.origin}/auth/x/callback`;
      
      // 簡易的な実装（実際にはX APIの認証フローを使用）
      console.log('X login not yet implemented');
      alert('X認証は現在開発中です。しばらくお待ちください。');
      
      return null;
    } catch (error) {
      console.error('X login error:', error);
      return null;
    }
  }

  // OAuth認証後のユーザー作成・ログイン
  async handleOAuthCallback(provider: 'google' | 'x', userInfo: {
    email: string;
    name: string;
    id: string;
  }): Promise<AuthSession | null> {
    try {
      // 既存ユーザーをチェック
      const users = JSON.parse(localStorage.getItem('fanclub-users') || '[]');
      let existingUser = users.find((u: User) => u.email === userInfo.email);

      if (existingUser) {
        // 既存ユーザーの場合、ログイン
        existingUser.lastLoginAt = new Date().toISOString();
        const updatedUsers = users.map((u: User) => 
          u.id === existingUser!.id ? existingUser : u
        );
        localStorage.setItem('fanclub-users', JSON.stringify(updatedUsers));
      } else {
        // 新規ユーザーの場合、作成
        const newUser: User = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
          subscription: {
            plan: 'basic' as const,
            status: 'active' as const,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        };

        users.push(newUser);
        localStorage.setItem('fanclub-users', JSON.stringify(users));
        existingUser = newUser;
      }

      const session: AuthSession = {
        user: existingUser,
        token: generateUserToken(existingUser.id),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      this.currentUser = existingUser;
      this.session = session;
      this.saveSession(session);

      return session;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return null;
    }
  }

  // ユーザー専用Supabaseクライアント取得
  getUserSupabase() {
    if (!this.currentUser) return null;
    return createUserSupabase(this.currentUser.id);
  }
}

export const authManager = AuthManager.getInstance();
