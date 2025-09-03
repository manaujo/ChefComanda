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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    return await response.json();
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
      const { data, error } = await supabase
        .from('stripe_customers')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Get subscription data for this customer
      const { data: subscriptionData, error: subError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', data.customer_id)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription data:', subError);
        return null;
      }

      const subscription = subscriptionData;
      
      // Return null if subscription is canceled or incomplete
      if (subscription && (subscription.subscription_status === 'canceled' || subscription.subscription_status === 'incomplete')) {
        return null;
      }
      
      return subscription ? {
        customer_id: data.customer_id,
        subscription_id: subscription.subscription_id,
        subscription_status: subscription.status,
        price_id: subscription.price_id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_method_brand: subscription.payment_method_brand,
        payment_method_last4: subscription.payment_method_last4
      } : null;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  async getUserOrders() {
    try {
      const { data, error } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
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