/*
  # Fix Cascade Drop Error for Stripe Functions

  1. Problem Fixed
    - Cannot drop function user_has_active_subscription because view depends on it
    - Need to use CASCADE to drop dependent objects
    - Recreate everything with correct variable names

  2. Solution
    - Drop view first, then functions
    - Recreate functions with current_timestamp_epoch instead of current_time
    - Recreate view with corrected functions

  3. Security
    - Maintain all existing RLS policies
    - Preserve subscription verification functionality
*/

-- Drop the view first to remove dependency
DROP VIEW IF EXISTS stripe_user_subscriptions CASCADE;

-- Drop all Stripe-related functions that might have dependencies
DROP FUNCTION IF EXISTS user_has_active_subscription(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_subscription_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS handle_subscription_success(text, text, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS debug_stripe_configuration() CASCADE;

-- Recreate get_plan_name_from_price_id function with your real Price IDs
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    WHEN 'price_1SzW0KB4if3rE1yX3gGCzDaQ' THEN 'Teste'
    WHEN 'price_1RucPuB4if3rE1yXh76pGzs7' THEN 'Plano Mensal'
    WHEN 'price_1RvfteB4if3rE1yXvpuv438F' THEN 'Plano Trimestral'
    WHEN 'price_1RucR4B4if3rE1yXEFat9ZXL' THEN 'Plano Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Recreate user_has_active_subscription function with corrected variable names
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status text;
  period_end integer;
  current_timestamp_epoch integer;
  cancel_at_end boolean;
BEGIN
  -- Buscar dados da assinatura
  SELECT ss.status, ss.current_period_end, ss.cancel_at_period_end
  INTO subscription_status, period_end, cancel_at_end
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.user_id = user_has_active_subscription.user_id
    AND sc.deleted_at IS NULL
  ORDER BY ss.created_at DESC
  LIMIT 1;
  
  -- Verificar se assinatura está ativa
  IF subscription_status IN ('active', 'trialing') THEN
    current_timestamp_epoch := extract(epoch from now())::integer;
    
    -- Se não tem data de fim ou ainda não expirou
    IF period_end IS NULL OR current_timestamp_epoch < period_end THEN
      -- Se está cancelada para o fim do período, ainda é válida até o fim
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate get_user_subscription_details function with corrected signature
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
  current_timestamp_epoch integer := extract(epoch from now())::integer;
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
    (ss.status IN ('active', 'trialing') AND (ss.current_period_end IS NULL OR current_timestamp_epoch < ss.current_period_end)) as is_active,
    CASE 
      WHEN ss.current_period_end IS NOT NULL AND current_timestamp_epoch < ss.current_period_end 
      THEN CEIL((ss.current_period_end - current_timestamp_epoch) / 86400.0)::integer
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

-- Recreate handle_subscription_success function
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
  -- Buscar user_id do customer
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = handle_subscription_success.customer_id
    AND sc.deleted_at IS NULL;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Customer não encontrado: %', customer_id;
  END IF;
  
  -- Obter nome do plano
  plan_name := get_plan_name_from_price_id(price_id);
  
  -- Atualizar ou inserir assinatura
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
  
  -- Criar notificação para o usuário
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
    'Sua assinatura do ' || plan_name || ' foi ativada com sucesso! Agora você tem acesso completo ao ChefComanda.',
    'system',
    jsonb_build_object(
      'plan_name', plan_name,
      'subscription_id', subscription_id,
      'price_id', price_id
    )
  );
  
  RAISE NOTICE 'Assinatura ativada para usuário %: % (%)', user_id, plan_name, subscription_id;
END;
$$;

-- Recreate debug_stripe_configuration function
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

-- Recreate stripe_user_subscriptions view with corrected functions
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

-- Recreate stripe_user_invoices view
DROP VIEW IF EXISTS stripe_user_invoices CASCADE;

CREATE VIEW stripe_user_invoices AS
SELECT 
  si.id,
  si.invoice_id,
  si.subscription_id,
  si.customer_id,
  si.amount_paid,
  si.currency,
  si.status,
  si.created_at,
  sc.user_id
FROM stripe_invoices si
JOIN stripe_customers sc ON si.customer_id = sc.customer_id
WHERE sc.user_id = auth.uid()
  AND sc.deleted_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_price_id ON stripe_subscriptions(price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_period_end ON stripe_subscriptions(current_period_end);

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'Erro de dependência CASCADE corrigido com sucesso!';
  RAISE NOTICE 'Todas as funções e views Stripe recriadas com variáveis corretas';
  RAISE NOTICE 'Sistema pronto para produção com seus produtos reais:';
  RAISE NOTICE '- Teste: price_1SzW0KB4if3rE1yX3gGCzDaQ (R$ 1,00/ano)';
  RAISE NOTICE '- Plano Mensal: price_1RucPuB4if3rE1yXh76pGzs7 (R$ 120,00/mês)';
  RAISE NOTICE '- Plano Trimestral: price_1RvfteB4if3rE1yXvpuv438F (R$ 360,00/trimestre)';
  RAISE NOTICE '- Plano Anual: price_1RucR4B4if3rE1yXEFat9ZXL (R$ 1.296,00/ano)';
  RAISE NOTICE 'Webhook Secret: whsec_yuJa1uPPPblLyaCVxg57px3wYGUZWrjQ';
  RAISE NOTICE 'Todas as dependências resolvidas!';
END $$;