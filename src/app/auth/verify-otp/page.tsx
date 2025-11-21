'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Phone, Key, AlertCircle, ArrowLeft } from 'lucide-react';
import { authManager } from '@/lib/auth';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpType, setOtpType] = useState<'email' | 'sms' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // URLパラメータからメールアドレスや電話番号を取得
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');
    const typeParam = searchParams.get('type') as 'email' | 'sms' | null;

    if (emailParam) {
      setEmail(emailParam);
      setOtpType('email');
    } else if (phoneParam) {
      setPhone(phoneParam);
      setOtpType('sms');
    } else if (typeParam) {
      setOtpType(typeParam);
    }
  }, [searchParams]);

  const handleSendOTP = async () => {
    setIsSending(true);
    setError('');

    try {
      let result;
      if (otpType === 'email') {
        if (!email.trim() || !email.includes('@')) {
          setError('有効なメールアドレスを入力してください。');
          setIsSending(false);
          return;
        }
        result = await authManager.sendEmailOTP(email);
      } else if (otpType === 'sms') {
        if (!phone.trim()) {
          setError('電話番号を入力してください。');
          setIsSending(false);
          return;
        }
        result = await authManager.sendSMSOTP(phone);
      } else {
        setError('認証タイプを選択してください。');
        setIsSending(false);
        return;
      }

      if (result.success) {
        setSuccess(true);
        setError('');
      } else {
        setError(result.error || '確認コードの送信に失敗しました。');
      }
    } catch (error) {
      console.error('確認コード送信エラー:', error);
      setError('確認コードの送信中にエラーが発生しました。');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!code.trim() || code.length < 6) {
        setError('確認コードを入力してください（6桁以上）。');
        setIsLoading(false);
        return;
      }

      let session;
      if (otpType === 'email') {
        if (!email.trim()) {
          setError('メールアドレスを入力してください。');
          setIsLoading(false);
          return;
        }
        session = await authManager.verifyEmailOTP(email, code);
      } else if (otpType === 'sms') {
        if (!phone.trim()) {
          setError('電話番号を入力してください。');
          setIsLoading(false);
          return;
        }
        session = await authManager.verifySMSOTP(phone, code);
      } else {
        setError('認証タイプが設定されていません。');
        setIsLoading(false);
        return;
      }

      if (session) {
        // ログインページにリダイレクト
        router.push('/app');
      } else {
        setError('確認コードが正しくありません。もう一度お試しください。');
      }
    } catch (error) {
      console.error('確認コード検証エラー:', error);
      setError('確認コードの検証中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
            <img 
              src="/logo.png" 
              alt="ファンリピ" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                ファンリピ
              </h1>
            </div>
          </div>
        </div>

        {/* 確認コード入力フォーム */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
          <div className="text-center mb-8">
            <button
              onClick={() => router.push('/app')}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4 mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              ログインに戻る
            </button>
            <Key className="h-12 w-12 text-pink-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              確認コードを入力
            </h1>
            <p className="text-gray-600">
              {otpType === 'email' 
                ? 'メールアドレスに送信された確認コードを入力してください'
                : otpType === 'sms'
                ? 'SMSで送信された確認コードを入力してください'
                : '確認コードを入力してください'}
            </p>
          </div>

          {!success ? (
            <div className="space-y-6">
              {/* メールアドレスまたは電話番号の入力 */}
              {otpType === 'email' && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-pink-50 text-gray-900 placeholder-gray-500"
                      style={{ backgroundColor: '#fce7f3' }}
                      placeholder="example@example.com"
                      required
                      disabled={isSending}
                    />
                  </div>
                </div>
              )}

              {otpType === 'sms' && (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-pink-50 text-gray-900 placeholder-gray-500"
                      style={{ backgroundColor: '#fce7f3' }}
                      placeholder="+81 90-1234-5678"
                      required
                      disabled={isSending}
                    />
                  </div>
                </div>
              )}

              {!otpType && (
                <div className="space-y-4">
                  <button
                    onClick={() => setOtpType('email')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-pink-500 transition-all"
                  >
                    <Mail className="h-5 w-5" />
                    <span>メールアドレスで認証</span>
                  </button>
                  <button
                    onClick={() => setOtpType('sms')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-pink-500 transition-all"
                  >
                    <Phone className="h-5 w-5" />
                    <span>電話番号で認証</span>
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {otpType && (
                <button
                  onClick={handleSendOTP}
                  disabled={isSending || (otpType === 'email' && !email.trim()) || (otpType === 'sms' && !phone.trim())}
                  className="w-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-pink-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSending ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>送信中...</span>
                    </div>
                  ) : (
                    '確認コードを送信'
                  )}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  確認コード
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-pink-50 text-gray-900 placeholder-gray-500 text-center text-2xl tracking-widest"
                    style={{ backgroundColor: '#fce7f3' }}
                    placeholder="000000"
                    required
                    maxLength={6}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {otpType === 'email' 
                    ? `${email} に送信された6桁のコードを入力してください`
                    : `${phone} に送信された6桁のコードを入力してください`}
                </p>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !code.trim() || code.length < 6}
                className="w-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white py-4 px-4 rounded-lg font-semibold hover:from-pink-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>確認中...</span>
                  </div>
                ) : (
                  '確認コードを検証'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setCode('');
                  setError('');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                コードを再送信
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

