import { supabase } from './supabase';

export interface CheckoutSessionRequest {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface CreateCustomerRequest {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

class StripeService {
  private static instance: StripeService;

  private constructor() {}

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  async createCustomer(customerData: CreateCustomerRequest): Promise<any> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create customer');
    }

    return await response.json();
  }

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log('🛒 Creating checkout session:', {
      priceId: request.priceId,
      mode: request.mode,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl
    });

    const defaultSuccessUrl = `${window.location.origin}/checkout/success`;
    const defaultCancelUrl = `${window.location.origin}/dashboard/profile/planos`;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: request.priceId,
        mode: request.mode,
        success_url: request.successUrl || defaultSuccessUrl,
        cancel_url: request.cancelUrl || defaultCancelUrl,
      }),
    });

    const responseText = await response.text();
    console.log('📥 Edge Function response:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      console.error('❌ Stripe checkout error:', errorData);
      
      // Mensagens de erro mais amigáveis
      if (errorData.error?.includes('No such price')) {
        throw new Error('Produto não encontrado no Stripe. Verifique se o produto está ativo no Stripe Dashboard.');
      } else if (errorData.error?.includes('Price ID não encontrado')) {
        throw new Error('Produto não encontrado no Stripe. Verifique se o produto está ativo no Stripe Dashboard.');
      } else if (errorData.error?.includes('User not authenticated')) {
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (errorData.error?.includes('Failed to create checkout session')) {
        throw new Error('Erro ao criar sessão de pagamento. Tente novamente em alguns instantes.');
      }
      
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = JSON.parse(responseText);
    console.log('✅ Checkout session created successfully:', data);
    return data;
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to cancel subscription');
    }

    return await response.json();
  }

  async getUserSubscription(): Promise<SubscriptionData | null> {
    try {
      console.log('🔍 Loading user subscription...');
      
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('ℹ️ No authenticated user found');
        return null;
      }
      
      console.log('👤 Loading subscription for user:', user.id);
      
      // Use the new RPC function to get effective subscription details
      const { data: effectiveSubscription, error: rpcError } = await supabase
        .rpc('get_effective_subscription_details', { p_user_id: user.id });

      if (rpcError) {
        console.error('❌ Error loading effective subscription:', rpcError);
        return null;
      }

      if (!effectiveSubscription || effectiveSubscription.length === 0) {
        console.log('ℹ️ No effective subscription found');
        return null;
      }

      const subscription = effectiveSubscription[0];
      
      console.log('📋 Effective subscription found:', {
        subscriptionId: subscription.subscription_id,
        status: subscription.status,
        priceId: subscription.price_id,
        currentPeriodEnd: subscription.current_period_end,
        isInherited: subscription.is_inherited,
        ownerName: subscription.owner_name
      });
      
      // Return null if subscription is canceled or incomplete
      if (subscription && (subscription.status === 'canceled' || subscription.status === 'incomplete')) {
        console.log('⚠️ Subscription canceled or incomplete');
        return null;
      }
      
      // Add inheritance info for employees
      const result = {
        customer_id: subscription.customer_id,
        subscription_id: subscription.subscription_id,
        subscription_status: subscription.status,
        price_id: subscription.price_id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_method_brand: subscription.payment_method_brand,
        payment_method_last4: subscription.payment_method_last4,
        is_inherited: subscription.is_inherited,
        owner_name: subscription.owner_name
      };
      
      if (subscription.is_inherited) {
        console.log('✅ Returning inherited subscription for employee');
      } else {
        console.log('✅ Returning direct subscription for admin');
      }
      
      return subscription ? result : null;
    } catch (error) {
      console.error('❌ General error loading subscription:', error);
      return null;
    }
  }

  async getUserOrders() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('ℹ️ No authenticated user found for orders');
        return [];
      }
      
      console.log('📋 Loading orders for user:', user.id);
      
      const { data, error } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('customer_id', (
          await supabase
            .from('stripe_customers')
            .select('customer_id')
            .eq('user_id', user.id)
            .single()
        ).data?.customer_id || '')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('❌ Error loading orders:', error);
        return [];
      }

      console.log('📋 Orders loaded:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ General error loading orders:', error);
      return [];
    }
  }

  async syncSubscription(): Promise<any> {
    try {
      console.log('🔄 Syncing subscription...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync subscription');
      }

      const result = await response.json();
      console.log('✅ Subscription synced:', result);
      return result;
    } catch (error) {
      console.error('❌ Error syncing subscription:', error);
      throw error;
    }
  }

  async redirectToCheckout(sessionId: string): Promise<void> {
    // For now, we'll redirect to the Stripe checkout URL
    // In a production app, you might want to use Stripe.js for a better UX
    const { data } = await supabase.functions.invoke('stripe-checkout', {
      body: { sessionId }
    });
    
    if (data?.url) {
      window.location.href = data.url;
    }
  }
}

export default StripeService.getInstance();