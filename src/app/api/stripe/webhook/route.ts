import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aksptiaptxogdipuysut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrc3B0aWFwdHhvZ2RpcHV5c3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMjMyMywiZXhwIjoyMDc0MTg4MzIzfQ.EpJsXq17uDoqlr7rP0HY4yv0zSEhS9OiCGgHTHFHHmI',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // リクエスト最適化
    global: {
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  }
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log('🔔 Checkout completed:', { userId, customerId, subscriptionId });

  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  // Stripeからサブスクリプション詳細を取得
  let priceId = 'pro_monthly'; // デフォルト値
  let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let periodStart = new Date();

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      priceId = subscription.items.data[0]?.price.id || 'pro_monthly';
      periodStart = new Date(subscription.current_period_start * 1000);
      periodEnd = new Date(subscription.current_period_end * 1000);
    } catch (e) {
      console.error('Failed to retrieve subscription:', e);
    }
  }

  // サブスクリプション情報を更新
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      price_id: priceId,
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('❌ Failed to upsert subscription:', error);
  } else {
    console.log('✅ Subscription upserted successfully for user:', userId);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  console.log('🔔 Subscription change:', { customerId, status: subscription.status });
  
  // ユーザーIDを取得
  const { data: subscriptionData } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscriptionData) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // サブスクリプション情報を更新
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: subscription.items.data[0]?.price.id || 'pro_monthly',
  };

  // 型安全にプロパティをチェック
  if ('current_period_start' in subscription && subscription.current_period_start) {
    updateData.current_period_start = new Date((subscription.current_period_start as number) * 1000).toISOString();
  }
  
  if ('current_period_end' in subscription && subscription.current_period_end) {
    updateData.current_period_end = new Date((subscription.current_period_end as number) * 1000).toISOString();
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('❌ Failed to update subscription:', error);
  } else {
    console.log('✅ Subscription updated for customer:', customerId);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // サブスクリプションステータスを更新
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_customer_id', customerId);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionId = (invoice as any).subscription ? String((invoice as any).subscription) : null;
  const amount = invoice.amount_paid;

  // ユーザーIDを取得
  const { data: subscriptionData } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscriptionData) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // 売上記録を追加
  await supabaseAdmin
    .from('sales')
    .insert({
      user_id: subscriptionData.user_id,
      subscription_id: subscriptionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stripe_payment_intent_id: (invoice as any).payment_intent ? String((invoice as any).payment_intent) : null,
      amount: amount,
      status: 'succeeded',
      purchased_at: new Date().toISOString(),
    });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // サブスクリプションステータスを更新
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_customer_id', customerId);
}

