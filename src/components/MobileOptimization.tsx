'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

export default function MobileOptimization() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768;
      const isTabletDevice = width >= 768 && width < 1024;
      
      if (isMobileDevice) {
        setDeviceType('mobile');
      } else if (isTabletDevice) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceName = () => {
    switch (deviceType) {
      case 'mobile':
        return 'モバイル';
      case 'tablet':
        return 'タブレット';
      default:
        return 'デスクトップ';
    }
  };

  const getOptimizationTips = () => {
    const tips = {
      mobile: [
        'タッチ操作に最適化されています',
        '縦向き表示を推奨します',
        '大きなボタンで操作しやすくなっています',
        'スワイプ操作に対応しています'
      ],
      tablet: [
        'タッチとマウス操作の両方に対応',
        '横向き表示でより多くの情報を表示',
        '中サイズのボタンでバランスの良い操作感',
        'ピンチズームに対応しています'
      ],
      desktop: [
        'フルサイズの画面で最大限の情報表示',
        'マウス操作に最適化されています',
        'キーボードショートカットに対応',
        '複数ウィンドウでの作業が可能'
      ]
    };
    
    return tips[deviceType];
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-3">
        {getDeviceIcon()}
        <h3 className="font-semibold text-blue-800">
          {getDeviceName()}表示モード
        </h3>
      </div>
      
      <div className="text-sm text-blue-700">
        <p className="mb-2">
          現在の画面サイズ: {window.innerWidth}px × {window.innerHeight}px
        </p>
        
        <div className="space-y-1">
          {getOptimizationTips().map((tip, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// モバイル最適化のためのユーティリティ関数
export const getMobileOptimizedClasses = (deviceType: 'mobile' | 'tablet' | 'desktop') => {
  const classes = {
    mobile: {
      container: 'px-2 py-4',
      button: 'px-4 py-3 text-base',
      card: 'p-4',
      grid: 'grid-cols-1 gap-4',
      text: 'text-sm',
      spacing: 'space-y-4'
    },
    tablet: {
      container: 'px-4 py-6',
      button: 'px-5 py-3 text-base',
      card: 'p-5',
      grid: 'grid-cols-2 gap-5',
      text: 'text-base',
      spacing: 'space-y-5'
    },
    desktop: {
      container: 'px-6 py-8',
      button: 'px-6 py-3 text-base',
      card: 'p-6',
      grid: 'grid-cols-3 gap-6',
      text: 'text-base',
      spacing: 'space-y-6'
    }
  };
  
  return classes[deviceType];
};

// タッチ操作の最適化
export const addTouchOptimizations = () => {
  // タッチデバイスでのホバー効果を無効化
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
  }
  
  // ダブルタップズームを無効化（必要に応じて）
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
};

// パフォーマンス最適化
export const optimizeForMobile = () => {
  // 画像の遅延読み込み
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
  
  // 不要なアニメーションを無効化（低性能デバイス向け）
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.body.classList.add('reduce-motion');
  }
};
