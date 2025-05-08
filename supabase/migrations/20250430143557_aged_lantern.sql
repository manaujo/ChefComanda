/*
  # Initial SaaS Schema Setup

  1. New Tables
    - `planos`
      - Stores subscription plan details
      - Fields for features, limits, and pricing
    
    - `restaurantes`
      - Stores restaurant information
      - Links to auth.users for authentication
      
    - `assinaturas`
      - Tracks active subscriptions
      - Links restaurants to plans
      
    - `faturas`
      - Stores billing history
      - Tracks payments and subscription changes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Ensure data isolation between restaurants
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  limite_mesas int NOT NULL,
  recursos jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT restaurantes_user_id_key UNIQUE (user_id)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  plano_id uuid REFERENCES planos NOT NULL,
  status text NOT NULL CHECK (status IN ('ativa', 'cancelada', 'pendente')),
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid REFERENCES assinaturas NOT NULL,
  valor decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('paga', 'pendente', 'cancelada')),
  forma_pagamento text,
  data_vencimento timestamptz NOT NULL,
  data_pagamento timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

-- Policies for plans (viewable by all authenticated users)
CREATE POLICY "Plans viewable by all authenticated users"
  ON planos FOR SELECT
  TO authenticated
  USING (true);

-- Policies for restaurants
CREATE POLICY "Users can view own restaurant"
  ON restaurantes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own restaurant"
  ON restaurantes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON assinaturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = assinaturas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Policies for invoices
CREATE POLICY "Users can view own invoices"
  ON faturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assinaturas
      JOIN restaurantes ON restaurantes.id = assinaturas.restaurante_id
      WHERE assinaturas.id = faturas.assinatura_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Insert default plans
INSERT INTO planos (nome, descricao, preco, limite_mesas, recursos) VALUES
(
  'Básico',
  'Ideal para pequenos estabelecimentos',
  99.90,
  5,
  '{"relatorios_avancados": false, "estoque": false, "impressao_cozinha": false}'
),
(
  'Pro',
  'Para restaurantes em crescimento',
  199.90,
  15,
  '{"relatorios_avancados": false, "estoque": true, "impressao_cozinha": true}'
),
(
  'Premium',
  'Solução completa para seu restaurante',
  299.90,
  -1,
  '{"relatorios_avancados": true, "estoque": true, "impressao_cozinha": true}'
);