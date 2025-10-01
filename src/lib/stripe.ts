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

// 価格ID定数
export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  YEARLY: process.env.STRIPE_PRICE_ID_YEARLY || '',
} as const;

// プラン情報
export const PLANS = {
  monthly: {
    name: '月額プラン',
    price: 980,
    priceId: STRIPE_PRICE_IDS.MONTHLY,
    interval: 'month',
  },
  yearly: {
    name: '年額プラン',
    price: 9800,
    priceId: STRIPE_PRICE_IDS.YEARLY,
    interval: 'year',
  },
} as const;

export type PlanType = keyof typeof PLANS;

