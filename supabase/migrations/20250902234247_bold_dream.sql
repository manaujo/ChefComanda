/*
  # Criar tabela stripe_invoices para histórico de pagamentos

  1. Nova Tabela
    - `stripe_invoices` - Histórico de faturas/pagamentos do Stripe
      - `id` (uuid, primary key)
      - `invoice_id` (text, unique) - ID da invoice no Stripe
      - `subscription_id` (text) - ID da assinatura
      - `customer_id` (text) - ID do cliente no Stripe
      - `amount_paid` (integer) - Valor pago em centavos
      - `currency` (text) - Moeda (BRL)
      - `status` (text) - Status da invoice (paid, open, etc)
      - `created_at` (timestamptz) - Data de criação

  2. Segurança
    - Enable RLS na tabela
    - Política para usuários verem apenas suas próprias invoices

  3. View
    - `stripe_user_invoices` - View que junta invoices com customers por user_id
*/

-- Criar tabela de invoices
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL UNIQUE,
  subscription_id text,
  customer_id text NOT NULL,
  amount_paid integer NOT NULL,
  currency text DEFAULT 'brl',
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

-- Política de segurança para invoices
CREATE POLICY "Users can view own invoices"
  ON stripe_invoices FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers WHERE user_id = auth.uid()
    )
  );

-- Criar view para invoices do usuário
CREATE OR REPLACE VIEW stripe_user_invoices AS
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer_id ON stripe_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription_id ON stripe_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created_at ON stripe_invoices(created_at);

-- Inserir dados de exemplo para teste (apenas se não existirem)
DO $$
DECLARE
  test_customer_id text;
  test_subscription_id text;
BEGIN
  -- Buscar um customer existente para inserir dados de exemplo
  SELECT customer_id, subscription_id INTO test_customer_id, test_subscription_id
  FROM stripe_user_subscriptions 
  LIMIT 1;
  
  IF test_customer_id IS NOT NULL THEN
    -- Inserir algumas invoices de exemplo
    INSERT INTO stripe_invoices (invoice_id, subscription_id, customer_id, amount_paid, currency, status, created_at)
    VALUES 
      ('in_test_001', test_subscription_id, test_customer_id, 12000, 'brl', 'paid', now() - interval '1 month'),
      ('in_test_002', test_subscription_id, test_customer_id, 12000, 'brl', 'paid', now() - interval '2 months'),
      ('in_test_003', test_subscription_id, test_customer_id, 12000, 'brl', 'paid', now() - interval '3 months')
    ON CONFLICT (invoice_id) DO NOTHING;
  END IF;
END $$;