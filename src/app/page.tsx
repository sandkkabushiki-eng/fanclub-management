'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    // アプリページにリダイレクト（一度だけ実行）
    // window.location.replaceを使用して確実にリダイレクト（履歴に残さない）
    if (typeof window !== 'undefined') {
      // 少し遅延を入れて確実にリダイレクト
      const timer = setTimeout(() => {
        window.location.replace('/app');
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして無限ループを防止

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50 to-pink-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p className="text-gray-600">アプリに移動中...</p>
      </div>
    </div>
  );
}