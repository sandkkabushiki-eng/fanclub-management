import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// サーバーサイド用Stripeインスタンス
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-08-27.basil',
});

// クライアントサイド用Stripeインスタンス
export const getStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
  return loadStripe(publishableKey);
};

// 価格ID定数（Stripeダッシュボードで作成したIDを環境変数に設定）
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
  PRO_YEARLY: process.env.STRIPE_PRICE_ID_PRO_YEARLY || '',
} as const;

// プラン情報（Stripe決済用）
export const PLANS = {
  monthly: {
    name: 'プロプラン（月額）',
    price: 2980,
    priceId: STRIPE_PRICE_IDS.PRO_MONTHLY,
    interval: 'month' as const,
  },
  yearly: {
    name: 'プロプラン（年額）',
    price: 29800,
    priceId: STRIPE_PRICE_IDS.PRO_YEARLY,
    interval: 'year' as const,
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Stripe Checkoutセッション作成用のオプション
export interface CreateCheckoutSessionOptions {
  userId: string;
  userEmail: string;
  plan: PlanType;
  successUrl: string;
  cancelUrl: string;
}

// Stripeカスタマーポータルセッション作成用
export interface CreatePortalSessionOptions {
  customerId: string;
  returnUrl: string;
}
