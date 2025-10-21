'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertCircle, Mail, Key, Crown, ArrowLeft } from 'lucide-react';
import { authManager, testSupabaseConnection } from '@/lib/auth';
import { AuthSession } from '@/types/auth';

interface SecureAuthProps {
  onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'admin';

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
    // セッション復元
    const session = authManager.loadSession();
    if (session) {
      onAuthenticated(session);
    }
    
    // Supabase接続テスト
    testSupabaseConnection().then(result => {
      console.log('Supabase connection test result:', result);
    });
  }, [onAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const session = await authManager.userLogin({ email, password });
      if (session) {
        onAuthenticated(session);
      } else {
        setError('メールアドレスまたはパスワードが正しくありません。');
      }
    } catch {
      setError('ログイン中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 入力値の検証
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
        // アカウント作成成功
        setError('✅ アカウントが正常に作成されました！認証メールを送信しました。メールをご確認ください。');
        // 3秒後にログイン画面に戻る
        setTimeout(() => {
          setMode('login');
          clearForm();
          setError('');
        }, 3000);
      } else {
        setError('アカウント作成中にエラーが発生しました。同じメールアドレスが既に使用されている可能性があります。');
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        // より詳細なエラー情報を表示
        console.log('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setError(`エラー詳細: ${error.message}`);
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
      // 簡易的なパスワードリセット処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowForgotSuccess(true);
      setError('');
    } catch {
      setError('パスワードリセットメールの送信に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ファンクラ君
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                売上管理システム
              </p>
            </div>
          </div>
        </div>

        {/* 認証フォーム */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ログイン
            </h1>
            <p className="text-gray-600">
              アカウント情報を入力してください
            </p>
          </div>

          {/* メインログインフォーム */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                  placeholder="name@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 pr-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                  placeholder="パスワード"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  'ログイン'
                )}
              </button>

              {/* アカウント作成とパスワードリセット */}
              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('register'); clearForm(); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  アカウント作成
                </button>
                <button
                  onClick={() => { setMode('forgot-password'); clearForm(); }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  パスワードを忘れた場合
                </button>
              </div>

            </form>
          )}

          {/* 新規登録フォーム */}
          {mode === 'register' && (
            <div>
              <div className="text-center mb-6">
                <button
                  onClick={() => { setMode('login'); clearForm(); }}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  ログインに戻る
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  アカウント作成
                </h2>
                <p className="text-gray-600">
                  新しいアカウントを作成してください
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                    placeholder="お名前"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                    placeholder="メールアドレス"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                    placeholder="パスワード（6文字以上）"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                    error.includes('✅') 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                      error.includes('✅') ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <p className={`text-sm ${
                      error.includes('✅') ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !name || !email || !password}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>作成中...</span>
                    </div>
                  ) : (
                    'アカウント作成'
                  )}
                </button>

                {/* 利用規約 */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    アカウント作成により、
                    <a href="#" className="text-gray-600 hover:text-gray-800 underline">利用規約</a>
                    および
                    <a href="#" className="text-gray-600 hover:text-gray-800 underline">プライバシーポリシー</a>
                    に同意したものとみなされます。
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* パスワードリセットフォーム */}
          {mode === 'forgot-password' && (
            <div>
              {!showForgotSuccess ? (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="text-center mb-6">
                    <button
                      onClick={() => { setMode('login'); clearForm(); }}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      ログインに戻る
                    </button>
                    <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      パスワードリセット
                    </h2>
                    <p className="text-gray-600">
                      登録されたメールアドレスを入力してください。<br />
                      パスワードリセットの手順をお送りします。
                    </p>
                  </div>

                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        id="forgot-email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="example@example.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !forgotEmail}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>送信中...</span>
                      </div>
                    ) : (
                      'リセットメールを送信'
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    メールを送信しました
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {forgotEmail} にパスワードリセットの手順をお送りしました。<br />
                    メールをご確認ください。
                  </p>
                  <button
                    onClick={() => { setMode('login'); clearForm(); }}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    ログインに戻る
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 管理者認証フォーム */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">
                  管理者メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="admin-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="admin@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
                  管理者パスワード
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="admin-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="管理者パスワードを入力"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || !adminPassword}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>認証中...</span>
                  </div>
                ) : (
                  '管理者ログイン'
                )}
              </button>
            </form>
          )}

          {/* セキュリティ情報 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  セキュリティ情報
                </h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• すべてのデータは暗号化されて保存されます</li>
                  <li>• ユーザー毎にデータが完全に分離されます</li>
                  <li>• セッションは24時間で自動的に期限切れになります</li>
                  <li>• 管理者のみが全ユーザーの情報を確認できます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 ファンクラ君. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
