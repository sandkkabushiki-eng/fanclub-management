'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertCircle, Mail, Key, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { authManager, testSupabaseConnection } from '@/lib/auth';
import { AuthSession } from '@/types/auth';

interface SecureAuthProps {
  onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'admin' | 'otp-login';

export default function SecureAuth({ onAuthenticated }: SecureAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotSuccess, setShowForgotSuccess] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    testSupabaseConnection().then(result => {
      console.log('Supabase connection test result:', result);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 10000);
      });
      
      const loginPromise = authManager.userLogin({ email, password });
      const session = await Promise.race([loginPromise, timeoutPromise]) as AuthSession | null;
      
      if (session) {
        onAuthenticated(session);
      } else {
        setError('メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error && error.message === 'Login timeout') {
        setError('ログインがタイムアウトしました。もう一度お試しください。');
      } else {
        setError('ログイン中にエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!name.trim()) {
        setError('お名前を入力してください。');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('有効なメールアドレスを入力してください。');
        return;
      }
      if (password.length < 6) {
        setError('パスワードは6文字以上で入力してください。');
        return;
      }

      const session = await authManager.registerUser({ email, password, name });
      if (session) {
        setError('✅ アカウントが正常に作成されました！');
        setTimeout(() => {
          setMode('login');
          clearForm();
          setError('');
        }, 3000);
      } else {
        setError('✅ 確認メールを送信しました。メールをご確認ください。');
        setTimeout(() => {
          setMode('login');
          clearForm();
          setError('');
        }, 3000);
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        if (error.message.includes('既に登録されています')) {
          setError('このメールアドレスは既に登録されています。');
        } else if (error.message.includes('パスワードの要件')) {
          setError('パスワードの要件を満たしていません。');
        } else {
          setError('✅ 確認メールを送信しました。');
          setTimeout(() => {
            setMode('login');
            clearForm();
            setError('');
          }, 3000);
        }
      } else {
        setError('アカウント作成中にエラーが発生しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const session = await authManager.adminLogin(adminPassword);
      if (session) {
        onAuthenticated(session);
      } else {
        setError('管理者認証に失敗しました。');
      }
    } catch {
      setError('管理者認証中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setAdminPassword('');
    setForgotEmail('');
    setError('');
    setShowForgotSuccess(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
        setError('有効なメールアドレスを入力してください。');
        setIsLoading(false);
        return;
      }

      const result = await authManager.resetPassword(forgotEmail);
      
      if (result.success) {
        setShowForgotSuccess(true);
        setError('');
      } else {
        setError(result.error || 'パスワードリセットメールの送信に失敗しました。');
      }
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      setError('パスワードリセットメールの送信中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-rose-200/40 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-amber-200/40 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative w-full max-w-md mx-auto animate-fade-in">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              ファンリピ
            </span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">ファンクラブ売上管理システム</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 border border-white/50 overflow-hidden">
          <div className="p-8">
            {/* Login Form */}
            {mode === 'login' && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">おかえりなさい</h2>
                  <p className="text-gray-500 text-sm">アカウント情報を入力してください</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                        style={{ paddingLeft: '48px', paddingRight: '16px' }}
                        placeholder="メールアドレス"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                        style={{ paddingLeft: '48px', paddingRight: '48px' }}
                        placeholder="パスワード"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 z-10"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl animate-scale-in ${
                      error.includes('✅') 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-rose-50 border border-rose-200'
                    }`}>
                      {error.includes('✅') ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                      )}
                      <p className={`text-sm font-medium ${error.includes('✅') ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-rose-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>ログイン中...</span>
                      </div>
                    ) : (
                      'ログイン'
                    )}
                  </button>

                  {isLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoading(false);
                        setError('');
                      }}
                      className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setMode('register'); clearForm(); }}
                      className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      アカウント作成 →
                    </button>
                    <button
                      onClick={() => { setMode('forgot-password'); clearForm(); }}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      パスワードを忘れた場合
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <>
                <button
                  onClick={() => { setMode('login'); clearForm(); }}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  ログインに戻る
                </button>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">アカウント作成</h2>
                  <p className="text-gray-500 text-sm">新しいアカウントを作成してください</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      style={{ paddingLeft: '48px', paddingRight: '16px' }}
                      placeholder="お名前"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      style={{ paddingLeft: '48px', paddingRight: '16px' }}
                      placeholder="メールアドレス"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      style={{ paddingLeft: '48px', paddingRight: '48px' }}
                      placeholder="パスワード（6文字以上）"
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 z-10"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {error && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl animate-scale-in ${
                      error.includes('✅') 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-rose-50 border border-rose-200'
                    }`}>
                      {error.includes('✅') ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                      )}
                      <p className={`text-sm font-medium ${error.includes('✅') ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !name || !email || !password}
                    className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>作成中...</span>
                      </div>
                    ) : (
                      'アカウント作成'
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center leading-relaxed mt-4">
                    アカウント作成により、
                    <a href="#" className="text-rose-500 hover:text-rose-600 underline underline-offset-2">利用規約</a>
                    および
                    <a href="#" className="text-rose-500 hover:text-rose-600 underline underline-offset-2">プライバシーポリシー</a>
                    に同意したものとみなされます。
                  </p>
                </form>
              </>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot-password' && (
              <>
                {!showForgotSuccess ? (
                  <>
                    <button
                      onClick={() => { setMode('login'); clearForm(); }}
                      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors group"
                    >
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      ログインに戻る
                    </button>

                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-rose-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">パスワードリセット</h2>
                      <p className="text-gray-500 text-sm">登録されたメールアドレスを入力してください</p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                          style={{ paddingLeft: '48px', paddingRight: '16px' }}
                          placeholder="メールアドレス"
                          required
                          disabled={isLoading}
                        />
                      </div>

                      {error && (
                        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-scale-in">
                          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-rose-700">{error}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading || !forgotEmail}
                        className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>送信中...</span>
                          </div>
                        ) : (
                          'リセットメールを送信'
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-4 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">メールを送信しました</h2>
                    <p className="text-gray-500 mb-8">
                      <span className="font-medium text-gray-700">{forgotEmail}</span> に<br />
                      パスワードリセットの手順をお送りしました。
                    </p>
                    <button
                      onClick={() => { setMode('login'); clearForm(); }}
                      className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                      ログインに戻る
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Admin Form */}
            {mode === 'admin' && (
              <>
                <button
                  onClick={() => { setMode('login'); clearForm(); }}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  ログインに戻る
                </button>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">管理者ログイン</h2>
                  <p className="text-gray-500 text-sm">管理者認証情報を入力してください</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      style={{ paddingLeft: '48px', paddingRight: '16px' }}
                      placeholder="管理者メールアドレス"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Key className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full py-4 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      style={{ paddingLeft: '48px', paddingRight: '48px' }}
                      placeholder="管理者パスワード"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 z-10"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-scale-in">
                      <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-rose-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email || !adminPassword}
                    className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>認証中...</span>
                      </div>
                    ) : (
                      '管理者ログイン'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Security Info Footer */}
          <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">セキュリティ保護</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  すべてのデータは暗号化され安全に保存されます。ユーザー毎にデータが完全に分離されています。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            © 2024 ファンリピ. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
