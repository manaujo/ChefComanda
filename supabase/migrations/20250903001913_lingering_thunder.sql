/*
  # Adicionar plan_name à view stripe_user_subscriptions

  1. Modificações na View
    - Adicionar plan_name baseado no price_id
    - Mapear price_ids para nomes dos planos
    - Manter compatibilidade com dados existentes

  2. Melhorias
    - Função para obter nome do plano
    - View atualizada com informações completas
*/

-- Função para mapear price_id para nome do plano
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    WHEN 'price_1S2w0KB4if3rE1yX3gGCzDaQ' THEN 'Teste'
    WHEN 'price_1RucPuB4if3rE1yXh76pGzs7' THEN 'Plano Mensal'
    WHEN 'price_1RvfteB4if3rE1yXvpuv438F' THEN 'Plano Trimestral'
    WHEN 'price_1RucR4B4if3rE1yXEFat9ZXL' THEN 'Plano Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Recriar a view com plan_name
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

-- Recriar a view stripe_user_invoices com user_id correto
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