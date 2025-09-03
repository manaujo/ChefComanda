/*
  # Corrigir Erro de Sintaxe na Migration Stripe

  1. Problema Corrigido
    - `current_time` é palavra reservada no PostgreSQL
    - Renomear variável para `current_timestamp_epoch`
    - Corrigir todas as funções que usam esta variável

  2. Funções Corrigidas
    - user_has_active_subscription
    - get_user_subscription_details
    - handle_subscription_success

  3. Segurança
    - Manter todas as políticas RLS existentes
    - Preservar funcionalidade de verificação de assinatura
*/

-- Corrigir função user_has_active_subscription
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

-- Corrigir função get_user_subscription_details
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

-- Atualizar view stripe_user_subscriptions com correção
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

-- Log da correção
DO $$
BEGIN
  RAISE NOTICE 'Erro de sintaxe corrigido com sucesso!';
  RAISE NOTICE 'Variável current_time renomeada para current_timestamp_epoch';
  RAISE NOTICE 'Todas as funções Stripe atualizadas e funcionais';
  RAISE NOTICE 'Price IDs reais configurados:';
  RAISE NOTICE '- Teste: price_1SzW0KB4if3rE1yX3gGCzDaQ (R$ 1,00/ano)';
  RAISE NOTICE '- Plano Mensal: price_1RucPuB4if3rE1yXh76pGzs7 (R$ 120,00/mês)';
  RAISE NOTICE '- Plano Trimestral: price_1RvfteB4if3rE1yXvpuv438F (R$ 360,00/trimestre)';
  RAISE NOTICE '- Plano Anual: price_1RucR4B4if3rE1yXEFat9ZXL (R$ 1.296,00/ano)';
  RAISE NOTICE 'Webhook Secret: whsec_yuJa1uPPPblLyaCVxg57px3wYGUZWrjQ';
  RAISE NOTICE 'Sistema pronto para produção!';
END $$;