import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;

console.log('🔑 Stripe Secret Key configured:', stripeSecret ? 'YES' : 'NO');
console.log('🌐 Environment:', stripeSecret?.includes('sk_live_') ? 'LIVE MODE' : 'TEST MODE');

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode } = await req.json();

    console.log('🛒 Stripe checkout request:', { 
      price_id, 
      mode, 
      success_url: success_url ? 'PROVIDED' : 'NOT PROVIDED', 
      cancel_url: cancel_url ? 'PROVIDED' : 'NOT PROVIDED'
    });

    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (error) {
      console.error('Parameter validation error:', error);
      return corsResponse({ error }, 400);
    }

    // Verificar se o Price ID existe no Stripe antes de criar a sessão
    try {
      console.log('🔍 Validating Price ID in Stripe:', price_id);
      const price = await stripe.prices.retrieve(price_id);
      console.log('✅ Price found and validated:', {
        id: price.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount,
        recurring: price.recurring
      });
      
      if (!price.active) {
        console.error('❌ Price is not active:', price_id);
        return corsResponse({ error: `Price ${price_id} is not active` }, 400);
      }
    } catch (priceError: any) {
      console.error('❌ Error validating Price ID:', priceError.message);
      
      // Verificar se é erro de Price ID não encontrado
      if (priceError.message.includes('No such price')) {
        return corsResponse({ 
          error: `Price ID não encontrado: ${price_id}. Verifique se o produto está ativo no Stripe Dashboard.`,
          details: priceError.message,
          suggestion: 'Acesse https://dashboard.stripe.com/products para verificar seus produtos'
        }, 400);
      }
      
      return corsResponse({ 
        error: `Erro ao validar Price ID: ${priceError.message}`,
        details: priceError.message
      }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { payload: user, error: getUserError } = await supabase.auth.admin.verifyJWT(token);

    if (getUserError) {
      console.error('User authentication error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      console.error('❌ User not found in JWT token');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('👤 User authenticated:', { userId: user.sub, email: user.email });

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.sub)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);

      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    console.log('Customer lookup result:', { customer, customerId: customer?.customer_id });

    let customerId;

    /**
     * In case we don't have a mapping yet, the customer does not exist and we need to create one.
     */
    if (!customer || !customer.customer_id) {
      console.log('🆕 Creating new Stripe customer...');
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.name || user.email,
        metadata: {
          userId: user.sub,
          source: 'chefcomanda'
        },
      });

      console.log(`✅ Customer created: ${newCustomer.id} for user ${user.sub}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.sub,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);

        // Try to clean up both the Stripe customer and subscription record
        try {
          await stripe.customers.del(newCustomer.id);
          await supabase.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up after customer mapping error:', deleteError);
        }

        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription in the database', createSubscriptionError);

          // Try to clean up the Stripe customer since we couldn't create the subscription
          try {
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('Failed to delete Stripe customer after subscription creation error:', deleteError);
          }

          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
      }

      customerId = newCustomer.id;

      console.log(`✅ Customer setup completed: ${customerId}`);
    } else {
      customerId = customer.customer_id;
      console.log('👤 Using existing customer:', customerId);

      if (mode === 'subscription') {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);

          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record for existing customer', createSubscriptionError);

            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
        }
      }
    }

    // create Checkout Session
    console.log('🛒 Creating checkout session:', { customerId, price_id, mode });
    
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
      locale: 'pt-BR',
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      metadata: {
        userId: user.sub,
        source: 'chefcomanda',
        plan_type: mode
      }
    };

    // Adicionar configurações específicas para assinatura
    if (mode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          userId: user.sub,
          source: 'chefcomanda'
        }
      };
      
      // Adicionar trial period se for o plano teste
      if (price_id === 'PRICE_ID_TESTE' || price_id.includes('teste')) {
        sessionConfig.subscription_data.trial_period_days = 7;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`✅ Checkout session created: ${session.id} for customer ${customerId}`);
    console.log('🔗 Checkout URL generated successfully');

    if (!session.url) {
      console.error('❌ Checkout URL was not generated');
      return corsResponse({ error: 'Failed to generate checkout URL' }, 500);
    }

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    
        errorMessage = 'Produto não encontrado no Stripe. Verifique se o produto está ativo.';
    let errorMessage = error.message;
    if (error.message.includes('No such price')) {
      errorMessage = 'Produto não encontrado no Stripe. Verifique se o produto está ativo no Stripe Dashboard.';
    } else if (error.message.includes('No such customer')) {
      errorMessage = 'Cliente não encontrado. Tente fazer logout e login novamente.';
    } else if (error.message.includes('Invalid Price ID')) {
      errorMessage = 'Price ID inválido. Verifique a configuração dos produtos.';
    }
    
    return corsResponse({ 
      error: errorMessage,
      details: error.message,
      price_id: price_id || 'unknown',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}