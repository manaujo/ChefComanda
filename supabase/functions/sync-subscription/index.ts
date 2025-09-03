import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'ChefComanda Subscription Sync',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Syncing subscription for user:', user.id);

    // Get or create customer
    let { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return new Response(JSON.stringify({ error: 'Failed to fetch customer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customer) {
      console.log('No customer found, creating one...');
      
      // Create customer in Stripe
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      // Save customer to database
      const { error: saveCustomerError } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: stripeCustomer.id,
        });

      if (saveCustomerError) {
        console.error('Error saving customer:', saveCustomerError);
        return new Response(JSON.stringify({ error: 'Failed to save customer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customer = { customer_id: stripeCustomer.id };
    }

    console.log('Customer ID:', customer.customer_id);

    // Fetch latest subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.customer_id,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    console.log('Stripe subscriptions found:', subscriptions.data.length);

    if (subscriptions.data.length === 0) {
      // Check for completed checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.customer_id,
        limit: 10,
      });

      console.log('Checkout sessions found:', sessions.data.length);

      for (const session of sessions.data) {
        if (session.mode === 'subscription' && session.subscription) {
          console.log('Found subscription from checkout session:', session.subscription);
          
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
            expand: ['default_payment_method'],
          });

          // Update database with subscription
          const { error: upsertError } = await supabase
            .from('stripe_subscriptions')
            .upsert({
              customer_id: customer.customer_id,
              subscription_id: subscription.id,
              price_id: subscription.items.data[0].price.id,
              status: subscription.status,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
                ? {
                    payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
                    payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
                  }
                : {}),
            }, {
              onConflict: 'customer_id',
            });

          if (upsertError) {
            console.error('Error upserting subscription:', upsertError);
          } else {
            console.log('Subscription synced successfully');
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Subscription synced successfully',
            subscription: {
              id: subscription.id,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // No subscription found
      const { error: updateError } = await supabase
        .from('stripe_subscriptions')
        .upsert({
          customer_id: customer.customer_id,
          status: 'not_started',
        }, {
          onConflict: 'customer_id',
        });

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      }

      return new Response(JSON.stringify({
        success: false,
        message: 'No active subscription found',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the latest subscription
    const subscription = subscriptions.data[0];
    console.log('Processing subscription:', subscription.id, 'Status:', subscription.status);

    // Update database with subscription
    const { error: upsertError } = await supabase
      .from('stripe_subscriptions')
      .upsert({
        customer_id: customer.customer_id,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
      }, {
        onConflict: 'customer_id',
      });

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Subscription synced successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription synced successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});