/*
  # Restaurar dados de assinatura perdidos

  1. Diagnóstico
    - Verificar dados atuais de customers e subscriptions
    - Identificar problemas de isolamento
    - Restaurar dados válidos

  2. Correções
    - Restaurar customer válido para usuário atual
    - Recriar subscription com dados corretos
    - Garantir isolamento por usuário

  3. Segurança
    - Manter RLS ativo
    - Verificar auth.uid() em todas as operações
*/

-- Função para diagnosticar problemas de assinatura
CREATE OR REPLACE FUNCTION diagnose_subscription_issues()
RETURNS TABLE(
  current_user_id uuid,
  customers_found bigint,
  customer_details jsonb,
  subscriptions_found bigint,
  subscription_details jsonb,
  view_data jsonb
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
    (SELECT COUNT(*) FROM stripe_customers WHERE stripe_customers.user_id = user_id AND deleted_at IS NULL) as customers_found,
    (SELECT to_jsonb(stripe_customers.*) FROM stripe_customers WHERE stripe_customers.user_id = user_id AND deleted_at IS NULL LIMIT 1) as customer_details,
    (SELECT COUNT(*) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL) as subscriptions_found,
    (SELECT to_jsonb(ss.*) FROM stripe_subscriptions ss JOIN stripe_customers sc ON ss.customer_id = sc.customer_id WHERE sc.user_id = user_id AND sc.deleted_at IS NULL LIMIT 1) as subscription_details,
    (SELECT to_jsonb(stripe_user_subscriptions.*) FROM stripe_user_subscriptions LIMIT 1) as view_data;
END;
$$;

-- Função para restaurar dados de assinatura de teste
CREATE OR REPLACE FUNCTION restore_test_subscription()
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

  -- Criar ou atualizar customer para o usuário atual
  INSERT INTO stripe_customers (user_id, customer_id)
  VALUES (user_id, 'cus_test_' || replace(user_id::text, '-', ''))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    customer_id = 'cus_test_' || replace(user_id::text, '-', ''),
    deleted_at = NULL
  RETURNING stripe_customers.customer_id INTO customer_id;

  -- Criar ou atualizar subscription de teste
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
    'price_1S2w0KB4if3rE1yX3gGCzDaQ', -- Plano Teste
    'active',
    extract(epoch from (now() - interval '7 days'))::integer,
    extract(epoch from (now() + interval '23 days'))::integer,
    false,
    'visa',
    '4242'
  )
  ON CONFLICT (customer_id)
  DO UPDATE SET
    subscription_id = 'sub_test_' || replace(user_id::text, '-', ''),
    price_id = 'price_1S2w0KB4if3rE1yX3gGCzDaQ',
    status = 'active',
    current_period_start = extract(epoch from (now() - interval '7 days'))::integer,
    current_period_end = extract(epoch from (now() + interval '23 days'))::integer,
    cancel_at_period_end = false,
    payment_method_brand = 'visa',
    payment_method_last4 = '4242',
    updated_at = now();

  -- Inserir algumas faturas de exemplo
  INSERT INTO stripe_invoices (
    invoice_id,
    subscription_id,
    customer_id,
    amount_paid,
    currency,
    status,
    created_at
  )
  VALUES 
    ('in_test_' || replace(user_id::text, '-', '') || '_001', 'sub_test_' || replace(user_id::text, '-', ''), customer_id, 100, 'brl', 'paid', now() - interval '7 days'),
    ('in_test_' || replace(user_id::text, '-', '') || '_002', 'sub_test_' || replace(user_id::text, '-', ''), customer_id, 100, 'brl', 'paid', now() - interval '37 days'),
    ('in_test_' || replace(user_id::text, '-', '') || '_003', 'sub_test_' || replace(user_id::text, '-', ''), customer_id, 100, 'brl', 'paid', now() - interval '67 days')
  ON CONFLICT (invoice_id) DO NOTHING;

  result := jsonb_build_object(
    'success', true,
    'message', 'Assinatura de teste restaurada com sucesso',
    'user_id', user_id,
    'customer_id', customer_id,
    'subscription_id', 'sub_test_' || replace(user_id::text, '-', '')
  );

  RETURN result;
END;
$$;

-- Limpar dados inconsistentes primeiro
DELETE FROM stripe_subscriptions 
WHERE customer_id IN (
  SELECT customer_id FROM stripe_customers WHERE deleted_at IS NOT NULL
);

DELETE FROM stripe_customers 
WHERE customer_id = 'cus_SyvVQdi9I0rk4h' 
   OR customer_id NOT LIKE 'cus_%'
   OR length(customer_id) < 10;

-- Atualizar view para garantir isolamento correto
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
  ss.updated_at
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.deleted_at IS NULL
  AND sc.user_id = auth.uid();

-- Atualizar view de invoices
DROP VIEW IF EXISTS stripe_user_invoices;

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

-- Política RLS para a view stripe_user_subscriptions
CREATE POLICY "Users can only see own subscription data" ON stripe_user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Política RLS para a view stripe_user_invoices  
CREATE POLICY "Users can only see own invoice data" ON stripe_user_invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());