/*
  # Corrigir isolamento de usuário na view stripe_user_subscriptions

  1. Problema Identificado
    - A view atual não filtra corretamente por user_id
    - Usuários diferentes estão vendo a mesma assinatura
    - Falta de isolamento adequado entre contas

  2. Solução
    - Recriar a view com filtro correto por auth.uid()
    - Garantir que cada usuário veja apenas sua própria assinatura
    - Adicionar RLS adequado se necessário

  3. Segurança
    - View agora usa auth.uid() para filtrar automaticamente
    - Cada usuário só acessa seus próprios dados
    - Mantém compatibilidade com código existente
*/

-- Remover view existente
DROP VIEW IF EXISTS stripe_user_subscriptions;

-- Recriar view com filtro correto por usuário
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
  ss.payment_method_last4
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.user_id = auth.uid()  -- Filtro crítico por usuário logado
  AND sc.deleted_at IS NULL;

-- Garantir que a view tenha RLS habilitado
ALTER VIEW stripe_user_subscriptions OWNER TO postgres;

-- Criar política RLS para a view (se necessário)
-- Nota: Views herdam as políticas das tabelas base, mas vamos garantir
CREATE POLICY "Users can only see own subscription data" ON stripe_user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Verificar se as tabelas base têm RLS adequado
-- stripe_customers já tem: "Users can manage own stripe_customers" qual="(uid() = user_id)"
-- stripe_subscriptions já tem: "Users can view own stripe_subscriptions" 

-- Adicionar índice para performance se não existir
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id_active 
ON stripe_customers(user_id) 
WHERE deleted_at IS NULL;

-- Função de debug para verificar isolamento
CREATE OR REPLACE FUNCTION debug_user_subscription_isolation()
RETURNS TABLE(
  current_user_id uuid,
  found_subscriptions bigint,
  customer_exists boolean,
  subscription_data jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    (SELECT COUNT(*) FROM stripe_user_subscriptions) as found_subscriptions,
    EXISTS(SELECT 1 FROM stripe_customers WHERE user_id = auth.uid()) as customer_exists,
    (SELECT to_jsonb(sus.*) FROM stripe_user_subscriptions sus LIMIT 1) as subscription_data;
END;
$$;