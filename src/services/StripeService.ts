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

class StripeService {
  private static instance: StripeService;

  private constructor() {}

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
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

  async getUserSubscription(): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      const subscription = data?.[0];
      
      // Return null if subscription is canceled or incomplete
      if (subscription && (subscription.subscription_status === 'canceled' || subscription.subscription_status === 'incomplete')) {
        return null;
      }
      return subscription || null;
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