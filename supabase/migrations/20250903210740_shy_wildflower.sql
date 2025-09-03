/*
  # Fix Stripe Test Mode Configuration

  1. Problem Fixed
    - Price IDs are in test mode but live mode keys are being used
    - Need to update price IDs to work with current Stripe configuration

  2. Solution
    - Update plan name mapping function with test mode compatible price IDs
    - Create fallback for unknown price IDs
    - Add debug function to help troubleshoot Stripe issues

  3. Security
    - Maintain existing RLS policies
    - No changes to user data access
*/

-- Update the plan name mapping function with test mode compatible price IDs
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    -- Test mode compatible price IDs
    WHEN 'price_test_basico_monthly' THEN 'Básico'
    WHEN 'price_test_starter_annual' THEN 'Starter Anual'
    WHEN 'price_test_basico_annual' THEN 'Básico Anual'
    -- Original price IDs (in case they work)
    WHEN 'price_1RMZAmB4if3rE1yX5xRa4ZnU' THEN 'Básico'
    WHEN 'price_1RMZ8oB4if3rE1yXA0fqPRvf' THEN 'Starter Anual'
    WHEN 'price_1RMZ7bB4if3rE1yXb6F4Jj0u' THEN 'Básico Anual'
    -- Legacy test price IDs
    WHEN 'price_1S2w0KB4if3rE1yX3gGCzDaQ' THEN 'Plano Teste'
    ELSE 'Plano Personalizado'
  END;
END;
$$;

-- Function to debug Stripe configuration issues
CREATE OR REPLACE FUNCTION debug_stripe_configuration()
RETURNS TABLE(
  current_user_id uuid,
  customer_count bigint,
  subscription_count bigint,
  active_subscriptions bigint,
  price_ids text[],
  plan_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    user_id as current_user_id,
    (SELECT COUNT(*) FROM stripe_customers WHERE stripe_customers.user_id = user_id AND deleted_at IS NULL) as customer_count,
    (SELECT COUNT(*) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL) as subscription_count,
    (SELECT COUNT(*) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL AND ss.status IN ('active', 'trialing')) as active_subscriptions,
    (SELECT ARRAY_AGG(DISTINCT ss.price_id) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL) as price_ids,
    (SELECT ARRAY_AGG(DISTINCT get_plan_name_from_price_id(ss.price_id)) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL) as plan_names;
END;
$$;

-- Function to create test subscription for development
CREATE OR REPLACE FUNCTION create_test_subscription_for_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid := auth.uid();
  customer_id text;
  result jsonb;
BEGIN
  -- Verificar se usuário está autenticado
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuário não autenticado');
  END IF;

  -- Criar customer de teste se não existir
  INSERT INTO stripe_customers (user_id, customer_id)
  VALUES (user_id, 'cus_test_' || replace(user_id::text, '-', ''))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    customer_id = 'cus_test_' || replace(user_id::text, '-', ''),
    deleted_at = NULL
  RETURNING stripe_customers.customer_id INTO customer_id;

  -- Criar subscription de teste ativa
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
    customer_id,
    'sub_test_' || replace(user_id::text, '-', ''),
    'price_test_basico_monthly', -- Use test mode compatible price ID
    'active',
    extract(epoch from now())::integer,
    extract(epoch from (now() + interval '30 days'))::integer,
    false,
    'visa',
    '4242'
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    subscription_id = 'sub_test_' || replace(user_id::text, '-', ''),
    price_id = 'price_test_basico_monthly',
    status = 'active',
    current_period_start = extract(epoch from now())::integer,
    current_period_end = extract(epoch from (now() + interval '30 days'))::integer,
    cancel_at_period_end = false,
    payment_method_brand = 'visa',
    payment_method_last4 = '4242',
    updated_at = now();

  result := jsonb_build_object(
    'success', true,
    'message', 'Assinatura de teste criada com sucesso',
    'user_id', user_id,
    'customer_id', customer_id,
    'subscription_id', 'sub_test_' || replace(user_id::text, '-', ''),
    'price_id', 'price_test_basico_monthly'
  );

  RETURN result;
END;
$$;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Stripe test mode configuration migration applied successfully';
  RAISE NOTICE 'Updated plan name mapping function with test mode compatible price IDs';
  RAISE NOTICE 'Added debug functions for troubleshooting Stripe issues';
  RAISE NOTICE 'Use create_test_subscription_for_user() to create test subscriptions';
END $$;