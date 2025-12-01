'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.location.replace('/app');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-rose-200/40 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-amber-200/40 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="relative text-center">
        {/* Logo */}
        <div className="mb-6 inline-flex">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-rose-500/30 animate-bounce">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        
        {/* Brand Name */}
        <h1 className="text-4xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            ファンリピ
          </span>
        </h1>
        
        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm font-medium">読み込み中</span>
        </div>
      </div>
    </div>
  );
}
