'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlanType, SUBSCRIPTION_PLANS, canAddModel } from '@/types/subscription';

interface SubscriptionState {
  planType: PlanType;
  status: 'active' | 'canceled' | 'expired' | 'trialing' | 'none';
  currentPeriodEnd: Date | null;
  isLoading: boolean;
  error: string | null;
}

interface UseSubscriptionReturn extends SubscriptionState {
  isPro: boolean;
  canAddMoreModels: (currentCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
  getMaxModels: () => number;
  getDataRetentionMonths: () => number;
}

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    planType: 'free',
    status: 'none',
    currentPeriodEnd: null,
    isLoading: true,
    error: null,
  });

  const fetchSubscription = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState({
          planType: 'free',
          status: 'none',
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // サブスクリプション情報を取得
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (これは正常、無料プランとして扱う)
        throw error;
      }

      if (subscription && subscription.status === 'active') {
        setState({
          planType: 'pro',
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end 
            ? new Date(subscription.current_period_end) 
            : null,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          planType: 'free',
          status: 'none',
          currentPeriodEnd: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setState(prev => ({
        ...prev,
        planType: 'free',
        isLoading: false,
        error: 'サブスクリプション情報の取得に失敗しました',
      }));
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const isPro = state.planType === 'pro' && state.status === 'active';
  
  const canAddMoreModels = (currentCount: number): boolean => {
    return canAddModel(currentCount, state.planType);
  };

  const getMaxModels = (): number => {
    return SUBSCRIPTION_PLANS[state.planType].features.maxModels;
  };

  const getDataRetentionMonths = (): number => {
    return SUBSCRIPTION_PLANS[state.planType].features.dataRetentionMonths;
  };

  return {
    ...state,
    isPro,
    canAddMoreModels,
    refreshSubscription: fetchSubscription,
    getMaxModels,
    getDataRetentionMonths,
  };
}

// モデル数制限チェック用のシンプルなフック
export function useModelLimit() {
  const { planType, isLoading, canAddMoreModels, getMaxModels } = useSubscription();
  const [modelCount, setModelCount] = useState<number>(0);

  useEffect(() => {
    const fetchModelCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('models')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setModelCount(count || 0);
    };

    fetchModelCount();
  }, []);

  return {
    modelCount,
    maxModels: getMaxModels(),
    canAddModel: canAddMoreModels(modelCount),
    remainingSlots: getMaxModels() === Infinity ? Infinity : Math.max(0, getMaxModels() - modelCount),
    isLoading,
    planType,
  };
}

