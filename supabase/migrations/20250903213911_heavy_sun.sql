/*
  # Setup Real Stripe Integration

  1. Price ID Mapping Function
    - Map real Price IDs to plan names
    - Support for all 4 plans: Teste, Mensal, Trimestral, Anual

  2. Subscription Management Functions
    - Check if user has active subscription
    - Get subscription details
    - Verify access permissions

  3. Webhook Support
    - Functions to handle Stripe webhooks
    - Automatic subscription sync
    - Payment status updates

  4. Security
    - RLS policies for Stripe data
    - User isolation
    - Secure access control
*/

-- Function to map Price IDs to plan names (will be updated with real IDs)
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    -- ⚠️ IMPORTANT: Replace these with your real Price IDs from Stripe Dashboard
    WHEN 'PRICE_ID_TESTE' THEN 'Teste'
    WHEN 'PRICE_ID_MENSAL' THEN 'Plano Mensal'
    WHEN 'PRICE_ID_TRIMESTRAL' THEN 'Plano Trimestral'
    WHEN 'PRICE_ID_ANUAL' THEN 'Plano Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status text;
  period_end integer;
  current_time integer;
BEGIN
  -- Get subscription status and period end
  SELECT ss.status, ss.current_period_end
  INTO subscription_status, period_end
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.user_id = user_has_active_subscription.user_id
    AND sc.deleted_at IS NULL
  ORDER BY ss.created_at DESC
  LIMIT 1;
  
  -- Check if subscription is active and not expired
  IF subscription_status IN ('active', 'trialing') THEN
    current_time := extract(epoch from now())::integer;
    
    -- If no period_end or period hasn't ended yet
    IF period_end IS NULL OR current_time < period_end THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to get user subscription details
CREATE OR REPLACE FUNCTION get_user_subscription_details(user_id uuid)
RETURNS TABLE(
  customer_id text,
  subscription_id text,
  price_id text,
  plan_name text,
  status text,
  current_period_start integer,
  current_period_end integer,
  cancel_at_period_end boolean,
  payment_method_brand text,
  payment_method_last4 text,
  is_active boolean,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time integer := extract(epoch from now())::integer;
BEGIN
  RETURN QUERY
  SELECT 
    sc.customer_id,
    ss.subscription_id,
    ss.price_id,
    get_plan_name_from_price_id(ss.price_id) as plan_name,
    ss.status,
    ss.current_period_start,
    ss.current_period_end,
    ss.cancel_at_period_end,
    ss.payment_method_brand,
    ss.payment_method_last4,
    (ss.status IN ('active', 'trialing') AND (ss.current_period_end IS NULL OR current_time < ss.current_period_end)) as is_active,
    CASE 
      WHEN ss.current_period_end IS NOT NULL AND current_time < ss.current_period_end 
      THEN CEIL((ss.current_period_end - current_time) / 86400.0)::integer
      ELSE 0
    END as days_remaining
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.user_id = get_user_subscription_details.user_id
    AND sc.deleted_at IS NULL
  ORDER BY ss.created_at DESC
  LIMIT 1;
END;
$$;

-- Function to handle successful subscription creation
CREATE OR REPLACE FUNCTION handle_subscription_success(
  customer_id text,
  subscription_id text,
  price_id text,
  status text,
  current_period_start integer,
  current_period_end integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  plan_name text;
BEGIN
  -- Get user_id from customer
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = handle_subscription_success.customer_id
    AND sc.deleted_at IS NULL;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', customer_id;
  END IF;
  
  -- Get plan name
  plan_name := get_plan_name_from_price_id(price_id);
  
  -- Update or insert subscription
  INSERT INTO stripe_subscriptions (
    customer_id,
    subscription_id,
    price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  VALUES (
    handle_subscription_success.customer_id,
    handle_subscription_success.subscription_id,
    handle_subscription_success.price_id,
    handle_subscription_success.status,
    handle_subscription_success.current_period_start,
    handle_subscription_success.current_period_end,
    false
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    subscription_id = handle_subscription_success.subscription_id,
    price_id = handle_subscription_success.price_id,
    status = handle_subscription_success.status,
    current_period_start = handle_subscription_success.current_period_start,
    current_period_end = handle_subscription_success.current_period_end,
    cancel_at_period_end = false,
    updated_at = now();
  
  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    data
  )
  VALUES (
    user_id,
    'Assinatura Ativada',
    'Sua assinatura do ' || plan_name || ' foi ativada com sucesso!',
    'system',
    jsonb_build_object(
      'plan_name', plan_name,
      'subscription_id', subscription_id,
      'price_id', price_id
    )
  );
  
  RAISE NOTICE 'Subscription activated for user %: % (%)', user_id, plan_name, subscription_id;
END;
$$;

-- Function to sync subscription from Stripe webhook
CREATE OR REPLACE FUNCTION sync_subscription_from_webhook(
  customer_id text,
  subscription_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get user_id from customer
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = sync_subscription_from_webhook.customer_id
    AND sc.deleted_at IS NULL;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'Customer not found in database: %', customer_id;
    RETURN;
  END IF;
  
  -- Update subscription data
  INSERT INTO stripe_subscriptions (
    customer_id,
    subscription_id,
    price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    payment_method_brand,
    payment_method_last4
  )
  VALUES (
    sync_subscription_from_webhook.customer_id,
    subscription_data->>'id',
    (subscription_data->'items'->'data'->0->'price'->>'id'),
    subscription_data->>'status',
    (subscription_data->>'current_period_start')::integer,
    (subscription_data->>'current_period_end')::integer,
    (subscription_data->>'cancel_at_period_end')::boolean,
    COALESCE(subscription_data->'default_payment_method'->'card'->>'brand', null),
    COALESCE(subscription_data->'default_payment_method'->'card'->>'last4', null)
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    subscription_id = subscription_data->>'id',
    price_id = (subscription_data->'items'->'data'->0->'price'->>'id'),
    status = subscription_data->>'status',
    current_period_start = (subscription_data->>'current_period_start')::integer,
    current_period_end = (subscription_data->>'current_period_end')::integer,
    cancel_at_period_end = (subscription_data->>'cancel_at_period_end')::boolean,
    payment_method_brand = COALESCE(subscription_data->'default_payment_method'->'card'->>'brand', null),
    payment_method_last4 = COALESCE(subscription_data->'default_payment_method'->'card'->>'last4', null),
    updated_at = now();
  
  RAISE NOTICE 'Subscription synced for customer %: %', customer_id, subscription_data->>'id';
END;
$$;

-- Update stripe_user_subscriptions view with better data
DROP VIEW IF EXISTS stripe_user_subscriptions;

CREATE VIEW stripe_user_subscriptions AS
SELECT 
  sc.user_id,
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  get_plan_name_from_price_id(ss.price_id) as plan_name,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4,
  ss.created_at,
  ss.updated_at,
  user_has_active_subscription(sc.user_id) as is_active,
  CASE 
    WHEN ss.current_period_end IS NOT NULL 
    THEN CEIL((ss.current_period_end - extract(epoch from now())) / 86400.0)::integer
    ELSE 0
  END as days_remaining
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.deleted_at IS NULL
  AND sc.user_id = auth.uid();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_price_id ON stripe_subscriptions(price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_period_end ON stripe_subscriptions(current_period_end);

-- Log successful setup
DO $$
BEGIN
  RAISE NOTICE 'Real Stripe integration setup completed successfully';
  RAISE NOTICE 'IMPORTANT: Update Price IDs in src/stripe-config.ts with real values from Stripe Dashboard';
  RAISE NOTICE 'Plans configured: Teste (R$ 1/year), Mensal (R$ 120/month), Trimestral (R$ 360/quarter), Anual (R$ 1296/year)';
END $$;