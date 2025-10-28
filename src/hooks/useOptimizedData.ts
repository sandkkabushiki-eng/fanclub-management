import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント（最適化版）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  }
);

// キャッシュ管理
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300000) { // デフォルト5分
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

const dataCache = new DataCache();

// API呼び出し最適化
class OptimizedAPI {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  
  async request(endpoint: string, options: RequestInit = {}, cacheKey?: string, ttl?: number) {
    // キャッシュチェック
    if (cacheKey) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // レート制限チェック
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId && !this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded');
    }
    
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // キャッシュに保存
      if (cacheKey && data.success) {
        dataCache.set(cacheKey, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
  
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const key = `${userId}:${Math.floor(now / 60000)}`; // 1分間のウィンドウ
    const limit = 100; // 1分間に100回まで
    
    const current = this.rateLimitMap.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
      return true;
    }
    
    if (current.count >= limit) {
      return false;
    }
    
    current.count++;
    return true;
  }
}

const api = new OptimizedAPI();

// 使用量監視フック
export function useUsageMonitoring() {
  const [usage, setUsage] = useState<{
    dataUsage: { current: number; limit: number; percentage: number };
    apiCalls: { current: number; limit: number; percentage: number };
    plan: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      
      const response = await api.request(
        '/api/usage-stats',
        { method: 'POST', body: JSON.stringify({ dataSize: 0, apiCalls: 0 }) },
        `usage-${user.id}`,
        60000 // 1分キャッシュ
      );
      
      if (response.success) {
        setUsage(response.data.currentUsage);
      } else {
        setError(response.error || 'Failed to fetch usage');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchUsage();
    
    // 5分ごとに更新
    const interval = setInterval(fetchUsage, 300000);
    return () => clearInterval(interval);
  }, [fetchUsage]);
  
  return { usage, loading, error, refetch: fetchUsage };
}

// データ管理フック（最適化版）
export function useOptimizedDataManagement() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async (params: {
    modelId?: string;
    year?: number;
    month?: number;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      
      const searchParams = new URLSearchParams();
      if (params.modelId) searchParams.set('modelId', params.modelId);
      if (params.year) searchParams.set('year', params.year.toString());
      if (params.month) searchParams.set('month', params.month.toString());
      
      const cacheKey = `monthly-data-${user.id}-${params.modelId}-${params.year}-${params.month}`;
      
      const response = await api.request(
        `/api/monthly-data?${searchParams.toString()}`,
        { method: 'GET' },
        cacheKey,
        300000 // 5分キャッシュ
      );
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const saveData = useCallback(async (data: {
    modelId: string;
    modelName: string;
    year: number;
    month: number;
    data: any[];
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      
      const response = await api.request(
        '/api/monthly-data',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      if (response.success) {
        // キャッシュをクリア
        dataCache.delete(`monthly-data-${user.id}-${data.modelId}-${data.year}-${data.month}`);
        await fetchData({ modelId: data.modelId, year: data.year, month: data.month });
      } else {
        setError(response.error || 'Failed to save data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);
  
  const deleteData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.request(
        `/api/monthly-data?id=${id}`,
        { method: 'DELETE' }
      );
      
      if (response.success) {
        // キャッシュをクリア
        dataCache.clear();
        await fetchData();
      } else {
        setError(response.error || 'Failed to delete data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);
  
  return {
    data,
    loading,
    error,
    fetchData,
    saveData,
    deleteData,
  };
}

// パフォーマンス監視フック
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    apiResponseTime: number;
    memoryUsage: number;
  }>({
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
  });
  
  useEffect(() => {
    const startTime = performance.now();
    
    // レンダリング時間の測定
    const measureRenderTime = () => {
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime,
      }));
    };
    
    // メモリ使用量の測定
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
        }));
      }
    };
  
    // 初回測定
    measureRenderTime();
    measureMemory();
    
    // 定期的な測定
    const interval = setInterval(() => {
      measureMemory();
    }, 30000); // 30秒ごと
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
}

// エラーハンドリングフック
export function useErrorHandling() {
  const [errors, setErrors] = useState<Array<{
    id: string;
    message: string;
    timestamp: Date;
    type: 'api' | 'validation' | 'network' | 'auth';
  }>>([]);
  
  const addError = useCallback((message: string, type: 'api' | 'validation' | 'network' | 'auth' = 'api') => {
    const error = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type,
    };
    
    setErrors(prev => [...prev.slice(-9), error]); // 最新10件のみ保持
    
    // 5秒後に自動削除
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.id !== error.id));
    }, 5000);
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  return {
    errors,
    addError,
    clearErrors,
  };
}

export { dataCache, api };

