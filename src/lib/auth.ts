import { createClient } from '@supabase/supabase-js';
import { User, AuthSession, LoginCredentials, RegisterData } from '@/types/auth';
import { clearAllUserData } from '@/utils/userDataIsolation';

// Supabase設定（環境変数から取得、フォールバックなしでセキュリティを確保）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 環境変数の検証
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。');
}

if (!SUPABASE_SERVICE_ROLE_KEY && typeof window === 'undefined') {
  console.warn('SUPABASE_SERVICE_ROLE_KEYが設定されていません。サーバーサイド機能が制限される可能性があります。');
}

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
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  return _supabase;
})();

export const supabaseAdmin: ReturnType<typeof createClient> | null = (() => {
  if (!_supabaseAdmin && SUPABASE_SERVICE_ROLE_KEY) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
})();

// Supabase接続テスト
export const testSupabaseConnection = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Testing Supabase connection...');
      console.log('URL:', SUPABASE_URL);
      if (SUPABASE_ANON_KEY) {
        console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
      }
    }
    
    // 基本的な接続テスト
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase connection test failed:', error);
      }
      return { success: false, error: error.message };
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Supabase connection test successful');
    }
    return { success: true, data };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Supabase connection test error:', error);
    }
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
      // 管理者の認証（環境変数から取得）
      const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
      
      if (!ADMIN_PASSWORD) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('管理者パスワードが環境変数に設定されていません。');
        }
        return null;
      }
      
      if (adminPassword === ADMIN_PASSWORD) {
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Admin login error:', error);
      }
      return null;
    }
  }

  // ユーザー認証（Supabase Auth使用）
  async userLogin(credentials: LoginCredentials): Promise<AuthSession | null> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 ログイン試行:', credentials.email);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Login error details:', {
            message: error.message,
            status: error.status,
            code: error.code
          });
        }
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Login successful, user data:', {
          userId: data.user?.id,
          email: data.user?.email,
          emailConfirmed: data.user?.email_confirmed_at
        });
      }

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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ ログイン成功:', user.email);
        }
        
        // ログイン後、Supabaseからユーザーデータを同期
        await this.syncUserDataFromSupabase(user.id);

        return session;
      }

      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('User login error:', error);
      }
      return null;
    }
  }
  
  // Supabaseからユーザーデータを同期
  private async syncUserDataFromSupabase(userId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Supabaseからユーザーデータを同期開始:', userId);
      }
      
      // モデルを同期
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('*')
        .eq('user_id', userId);
      
      if (modelsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('モデル同期エラー:', modelsError);
        }
      } else if (modelsData && modelsData.length > 0) {
        const userStorageKey = `fanclub-models-${userId}`;
        localStorage.setItem(userStorageKey, JSON.stringify(modelsData));
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ モデルを同期しました:', modelsData.length, '件');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📭 Supabaseにモデルデータがありません');
        }
      }
      
      // 月次データを同期
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('monthly_data')
        .select('*')
        .eq('user_id', userId);
      
      if (monthlyError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('月次データ同期エラー:', monthlyError);
        }
      } else if (monthlyData && monthlyData.length > 0) {
        const userDataKey = `fanclub-model-data-${userId}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedData: Record<string, any> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monthlyData.forEach((row: any) => {
          const key = `${row.model_id}_${row.year}_${row.month}`;
          formattedData[key] = {
            modelId: row.model_id,
            modelName: row.model_name,
            year: row.year,
            month: row.month,
            data: row.data,
            analysis: row.analysis,
            uploadedAt: row.created_at,
            lastModified: row.updated_at
          };
        });
        localStorage.setItem(userDataKey, JSON.stringify(formattedData));
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 月次データを同期しました:', monthlyData.length, '件');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📭 Supabaseに月次データがありません');
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ データ同期完了');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚨 データ同期エラー:', error);
      }
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Registration error:', error);
          // より詳細なエラー情報を提供
          console.log('Supabase registration error details:', {
            message: error.message,
            status: error.status,
            code: error.code
          });
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('User created successfully, trigger will handle user data insertion');
        }

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
      if (process.env.NODE_ENV === 'development') {
        console.error('User registration error:', error);
      }
      
      // Supabaseが使えない場合（オフライン時）は、メール送信完了として扱う
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch')
      )) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Supabase is offline, treating as email sent successfully');
        }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Supabaseセッション確認中...');
      }
      
      // まずSupabaseのセッションを確認（タイムアウト付き）
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Supabase session timeout')), 1500);
      });
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any }, error: any };
      const { data: { session: supabaseSession }, error } = result;
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Supabase session error:', error.message);
        }
        
        // リフレッシュトークンエラーの場合はセッションをクリア
        if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('refresh_token_not_found') || error.message?.includes('JWTExpired') ||
            error.message?.includes('Token refresh failed')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 リフレッシュトークンエラーを検出、セッションをクリアします...');
          }
          // 即座にlocalStorageとsessionStorageをクリア
          if (typeof window !== 'undefined') {
            // Supabase関連のすべてのキーをクリア
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              if (process.env.NODE_ENV === 'development') {
                console.log('🗑️ Supabaseキーを削除:', key);
              }
            });
            sessionStorage.removeItem('fanclub-session');
          }
          await this.logout();
          return null;
        }
        
        // その他のエラーの場合もローカルセッションをクリア
        await this.logout();
        return null;
      }

      if (supabaseSession) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Supabaseセッションが見つかりました');
        }
        // Supabaseセッションが有効な場合
        const authSession: AuthSession = {
          user: {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email || '',
            name: supabaseSession.user.user_metadata?.name || supabaseSession.user.email || '',
            role: 'user',
            createdAt: supabaseSession.user.created_at,
            lastLoginAt: new Date().toISOString(),
            isActive: true,
            subscription: {
              plan: 'basic' as const,
              status: 'active' as const,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          },
          expiresAt: new Date(supabaseSession.expires_at! * 1000).toISOString(),
          token: supabaseSession.access_token
        };
        
        this.currentUser = authSession.user;
        sessionStorage.setItem('fanclub-session', JSON.stringify(authSession));
        return authSession;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Supabaseセッションが見つかりませんでした');
      }
      // Supabaseセッションがない場合はローカルセッションを確認
      const sessionData = sessionStorage.getItem('fanclub-session');
      if (!sessionData) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ ローカルセッションも見つかりませんでした');
        }
        return null;
      }

      const session = JSON.parse(sessionData) as AuthSession;
      
      // セッションの有効期限チェック
      if (new Date(session.expiresAt) < new Date()) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏰ セッションの有効期限が切れています');
        }
        this.logout();
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ ローカルセッションが見つかりました');
      }
      this.currentUser = session.user;
      this.session = session;
      return session;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Session load error:', error);
      }
      
      // リフレッシュトークンエラーの場合はセッションをクリア
      if (error instanceof Error && (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token') ||
          error.message?.includes('refresh_token_not_found') || error.message?.includes('JWTExpired') ||
          error.message?.includes('Token refresh failed'))) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 リフレッシュトークンエラーを検出、セッションをクリアします...');
        }
        // 即座にlocalStorageとsessionStorageをクリア
        if (typeof window !== 'undefined') {
          // Supabase関連のすべてのキーをクリア
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            if (process.env.NODE_ENV === 'development') {
              console.log('🗑️ Supabaseキーを削除:', key);
            }
          });
          sessionStorage.removeItem('fanclub-session');
        }
      }
      
      await this.logout();
      return null;
    }
  }

  // ログアウト
  async logout(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 ログアウト処理開始');
    }
    
    try {
      // Supabaseからもログアウト
      await supabase.auth.signOut();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Supabaseログアウト完了');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Supabase logout error:', error);
      }
    }
    
    // ユーザーデータを完全にクリア
    clearAllUserData();
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ ユーザーデータクリア完了');
    }
    
    // すべてのfanclub関連データを削除（念のため）
    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 全fanclub関連データをクリア');
      }
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('fanclub-model') || key.includes('fanclub-global'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ 削除:', key);
        }
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ ローカルストレージクリア完了:', keysToRemove.length, '件');
      }
      
      sessionStorage.removeItem('fanclub-session');
      localStorage.removeItem('fanclub-session');
    }
    
    this.currentUser = null;
    this.session = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ ログアウト完了: 全ユーザーデータをクリアしました');
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Google login error:', error);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('X login not yet implemented');
      }
      alert('X認証は現在開発中です。しばらくお待ちください。');
      
      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('X login error:', error);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('OAuth callback error:', error);
      }
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
