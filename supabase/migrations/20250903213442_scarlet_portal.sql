/*
  # Atualizar Sistema Stripe para Produtos Reais

  1. Produtos Reais
    - Teste: R$ 1,00/ano
    - Plano Mensal: R$ 120,00/mês  
    - Plano Trimestral: R$ 360,00/trimestre
    - Plano Anual: R$ 1.296,00/ano

  2. Funcionalidades
    - Todos os planos dão acesso completo (apenas diferem no tempo)
    - Sistema de checkout funcional
    - Verificação de status de assinatura
    - Atualização automática de permissões

  3. Segurança
    - Manter RLS policies existentes
    - Atualizar função de mapeamento de planos
*/

-- Atualizar função de mapeamento de Price IDs para produtos reais
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    -- IMPORTANTE: Substitua estes Price IDs pelos IDs reais da sua conta Stripe
    -- Para obter os Price IDs corretos:
    -- 1. Acesse https://dashboard.stripe.com/products
    -- 2. Clique em cada produto
    -- 3. Copie o Price ID (começa com price_)
    WHEN 'PRICE_ID_TESTE' THEN 'Teste'
    WHEN 'PRICE_ID_MENSAL' THEN 'Plano Mensal'
    WHEN 'PRICE_ID_TRIMESTRAL' THEN 'Plano Trimestral'
    WHEN 'PRICE_ID_ANUAL' THEN 'Plano Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Função para verificar se usuário tem acesso completo (qualquer plano ativo)
CREATE OR REPLACE FUNCTION user_has_full_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status text;
BEGIN
  -- Buscar status da assinatura do usuário
  SELECT ss.status INTO subscription_status
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.user_id = user_has_full_access.user_id
    AND sc.deleted_at IS NULL
    AND ss.status IN ('active', 'trialing');
  
  -- Retorna true se tem assinatura ativa
  RETURN subscription_status IS NOT NULL;
END;
$$;

-- Função para obter detalhes da assinatura do usuário
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
  payment_method_last4 text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    ss.payment_method_last4
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.user_id = get_user_subscription_details.user_id
    AND sc.deleted_at IS NULL
  ORDER BY ss.created_at DESC
  LIMIT 1;
END;
$$;

-- Função para limpar dados de teste e preparar para produção
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remover customers de teste
  DELETE FROM stripe_customers 
  WHERE customer_id LIKE 'cus_test_%';
  
  -- Remover subscriptions de teste
  DELETE FROM stripe_subscriptions 
  WHERE subscription_id LIKE 'sub_test_%'
     OR customer_id LIKE 'cus_test_%';
  
  -- Remover invoices de teste
  DELETE FROM stripe_invoices 
  WHERE invoice_id LIKE 'in_test_%'
     OR customer_id LIKE 'cus_test_%';
  
  RAISE NOTICE 'Dados de teste removidos com sucesso';
END;
$$;

-- Função para debug de configuração Stripe
CREATE OR REPLACE FUNCTION debug_stripe_setup()
RETURNS TABLE(
  total_customers bigint,
  total_subscriptions bigint,
  active_subscriptions bigint,
  price_ids_in_use text[],
  plan_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM stripe_customers WHERE deleted_at IS NULL) as total_customers,
    (SELECT COUNT(*) FROM stripe_subscriptions) as total_subscriptions,
    (SELECT COUNT(*) FROM stripe_subscriptions WHERE status IN ('active', 'trialing')) as active_subscriptions,
    (SELECT ARRAY_AGG(DISTINCT price_id) FROM stripe_subscriptions WHERE price_id IS NOT NULL) as price_ids_in_use,
    (SELECT ARRAY_AGG(DISTINCT get_plan_name_from_price_id(price_id)) FROM stripe_subscriptions WHERE price_id IS NOT NULL) as plan_names;
END;
$$;

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE 'Sistema Stripe configurado para produtos reais';
  RAISE NOTICE 'IMPORTANTE: Atualize os Price IDs no arquivo stripe-config.ts com os IDs reais da sua conta Stripe';
  RAISE NOTICE 'Produtos configurados:';
  RAISE NOTICE '- Teste: R$ 1,00/ano';
  RAISE NOTICE '- Plano Mensal: R$ 120,00/mês';
  RAISE NOTICE '- Plano Trimestral: R$ 360,00/trimestre';
  RAISE NOTICE '- Plano Anual: R$ 1.296,00/ano';
END $$;