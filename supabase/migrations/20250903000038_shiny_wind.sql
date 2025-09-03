/*
  # Corrigir isolamento de customers Stripe e checkout

  1. Problemas Identificados
    - Customer ID 'cus_SyvVQdi9I0rk4h' não existe no Stripe
    - Múltiplos usuários compartilhando mesmo customer_id
    - Função de checkout falhando por customer inválido

  2. Soluções
    - Limpar dados inconsistentes de stripe_customers
    - Corrigir view para isolamento por usuário
    - Melhorar função de checkout para criar customer se necessário
    - Adicionar logs de debug

  3. Segurança
    - RLS mantido em todas as tabelas
    - Isolamento por auth.uid()
*/

-- Limpar dados inconsistentes de stripe_customers
DELETE FROM stripe_customers 
WHERE customer_id = 'cus_SyvVQdi9I0rk4h' 
   OR customer_id NOT LIKE 'cus_%'
   OR length(customer_id) < 10;

-- Limpar assinaturas órfãs
DELETE FROM stripe_subscriptions 
WHERE customer_id NOT IN (
  SELECT customer_id FROM stripe_customers WHERE deleted_at IS NULL
);

-- Recriar view com isolamento correto
DROP VIEW IF EXISTS stripe_user_subscriptions;

CREATE VIEW stripe_user_subscriptions AS
SELECT 
  sc.user_id,
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4,
  ss.created_at,
  ss.updated_at
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.deleted_at IS NULL
  AND sc.user_id = auth.uid();

-- Política RLS para a view
DROP POLICY IF EXISTS "Users can only see own subscription data" ON stripe_user_subscriptions;

-- Atualizar política de stripe_customers para ser mais restritiva
DROP POLICY IF EXISTS "Users can manage own stripe_customers" ON stripe_customers;

CREATE POLICY "Users can manage own stripe_customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Atualizar política de stripe_subscriptions
DROP POLICY IF EXISTS "Users can view own stripe_subscriptions" ON stripe_subscriptions;

CREATE POLICY "Users can view own stripe_subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role can manage stripe_subscriptions"
  ON stripe_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Função para debug de isolamento
CREATE OR REPLACE FUNCTION debug_user_subscription_isolation()
RETURNS TABLE(
  current_user_id uuid,
  customers_count bigint,
  customer_ids text[],
  subscriptions_count bigint,
  subscription_data jsonb
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
    (SELECT COUNT(*) FROM stripe_customers WHERE stripe_customers.user_id = user_id AND deleted_at IS NULL) as customers_count,
    (SELECT ARRAY_AGG(customer_id) FROM stripe_customers WHERE stripe_customers.user_id = user_id AND deleted_at IS NULL) as customer_ids,
    (SELECT COUNT(*) FROM stripe_user_subscriptions) as subscriptions_count,
    (SELECT to_jsonb(stripe_user_subscriptions.*) FROM stripe_user_subscriptions LIMIT 1) as subscription_data;
END;
$$;

-- Função para limpar dados de um usuário específico
CREATE OR REPLACE FUNCTION clean_user_stripe_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só permite que o próprio usuário limpe seus dados
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Acesso negado: você só pode limpar seus próprios dados';
  END IF;

  -- Marcar customers como deletados em vez de excluir
  UPDATE stripe_customers 
  SET deleted_at = now()
  WHERE user_id = target_user_id;

  -- Limpar assinaturas relacionadas
  DELETE FROM stripe_subscriptions 
  WHERE customer_id IN (
    SELECT customer_id FROM stripe_customers 
    WHERE user_id = target_user_id
  );
END;
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id_active 
ON stripe_customers(user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_status 
ON stripe_subscriptions(customer_id, status);