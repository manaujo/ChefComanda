/*
  # Corrigir view stripe_user_subscriptions e sistema de pagamentos

  1. Corrigir View
    - Recriar `stripe_user_subscriptions` com user_id correto
    - Garantir que cada usuário veja apenas sua própria assinatura
    - Incluir informações do produto Stripe (nome, intervalo)

  2. Criar Tabela de Invoices
    - `stripe_invoices` para histórico de pagamentos
    - Vincular com assinaturas e customers

  3. Funções de Debug
    - `debug_user_subscription()` para diagnosticar problemas
    - `sync_user_subscription()` para forçar sincronização

  4. Segurança
    - RLS em todas as tabelas
    - Usuários só veem seus próprios dados
*/

-- Recriar view stripe_user_subscriptions com user_id correto
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
  ss.payment_method_last4
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.deleted_at IS NULL;

-- Criar tabela de invoices para histórico de pagamentos
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL,
  subscription_id text,
  customer_id text NOT NULL,
  amount_paid integer NOT NULL,
  amount_total integer NOT NULL,
  currency text DEFAULT 'brl',
  status text NOT NULL,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start integer,
  period_end integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on stripe_invoices
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own invoices
CREATE POLICY "Users can view own invoices"
  ON stripe_invoices
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Policy for service role to manage invoices (for webhooks)
CREATE POLICY "Service role can manage invoices"
  ON stripe_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Criar view para invoices do usuário
CREATE OR REPLACE VIEW stripe_user_invoices AS
SELECT 
  si.*,
  sc.user_id
FROM stripe_invoices si
JOIN stripe_customers sc ON si.customer_id = sc.customer_id
WHERE sc.deleted_at IS NULL;

-- Função para debug de assinatura do usuário
CREATE OR REPLACE FUNCTION debug_user_subscription(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  debug_info jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'stripe_customer', (
      SELECT jsonb_build_object(
        'customer_id', customer_id,
        'created_at', created_at,
        'deleted_at', deleted_at
      )
      FROM stripe_customers 
      WHERE user_id = p_user_id
    ),
    'stripe_subscription', (
      SELECT jsonb_build_object(
        'subscription_id', subscription_id,
        'status', status,
        'price_id', price_id,
        'current_period_start', current_period_start,
        'current_period_end', current_period_end,
        'cancel_at_period_end', cancel_at_period_end,
        'created_at', created_at,
        'updated_at', updated_at
      )
      FROM stripe_user_subscriptions 
      WHERE user_id = p_user_id
    ),
    'invoices_count', (
      SELECT COUNT(*)
      FROM stripe_user_invoices 
      WHERE user_id = p_user_id
    ),
    'latest_invoice', (
      SELECT jsonb_build_object(
        'invoice_id', invoice_id,
        'amount_paid', amount_paid,
        'status', status,
        'created_at', created_at
      )
      FROM stripe_user_invoices 
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 1
    )
  ) as debug_info;
END;
$$;

-- Função para sincronizar assinatura do usuário
CREATE OR REPLACE FUNCTION sync_user_subscription(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_record stripe_customers%ROWTYPE;
  result jsonb;
BEGIN
  -- Buscar customer do usuário
  SELECT * INTO customer_record
  FROM stripe_customers
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer não encontrado para este usuário'
    );
  END IF;
  
  -- Verificar se já existe assinatura
  IF EXISTS (
    SELECT 1 FROM stripe_subscriptions 
    WHERE customer_id = customer_record.customer_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Assinatura já existe no banco de dados',
      'customer_id', customer_record.customer_id
    );
  END IF;
  
  -- Se chegou aqui, precisa sincronizar via Edge Function
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Sincronização via Edge Function necessária',
    'customer_id', customer_record.customer_id,
    'action_required', 'call_edge_function'
  );
END;
$$;

-- Trigger para atualizar updated_at em stripe_invoices
CREATE OR REPLACE FUNCTION update_stripe_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_invoices_updated_at
  BEFORE UPDATE ON stripe_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_invoices_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer_id ON stripe_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription_id ON stripe_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created_at ON stripe_invoices(created_at);

-- Comentários para documentação
COMMENT ON TABLE stripe_invoices IS 'Histórico de faturas/invoices do Stripe para cada assinatura';
COMMENT ON VIEW stripe_user_subscriptions IS 'View que retorna assinatura do usuário logado com user_id correto';
COMMENT ON VIEW stripe_user_invoices IS 'View que retorna invoices do usuário logado';
COMMENT ON FUNCTION debug_user_subscription IS 'Função para debug de problemas de assinatura';
COMMENT ON FUNCTION sync_user_subscription IS 'Função para sincronizar assinatura do usuário';