import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, userEmail } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json(
        { error: 'Plan and userId are required' },
        { status: 400 }
      );
    }

    if (!PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    
    // 価格IDが設定されているか確認
    if (!selectedPlan.priceId) {
      console.error('Price ID not configured for plan:', plan);
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // ユーザー情報を取得（auth.usersから）
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    const email = authUser?.user?.email || userEmail;
    const name = authUser?.user?.user_metadata?.name || email?.split('@')[0];

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 404 }
      );
    }

    // 既存のStripe顧客を確認
    let customerId: string;
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // 新しいStripe顧客を作成
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // 顧客IDをデータベースに保存
      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          price_id: selectedPlan.priceId,
          status: 'incomplete',
        });
    }

    // アプリURLを決定
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fanripi.com';

    // Stripe Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/app?success=true`,
      cancel_url: `${appUrl}/upgrade?canceled=true`,
      metadata: {
        userId: userId,
        plan: plan,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

