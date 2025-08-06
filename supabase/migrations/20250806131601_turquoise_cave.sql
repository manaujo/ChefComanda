/*
  # Esquema Completo do ChefComanda

  1. Novas Tabelas
    - `profiles` - Perfis de usuários
    - `user_roles` - Funções dos usuários
    - `restaurantes` - Dados dos restaurantes
    - `mesas` - Mesas do restaurante
    - `produtos` - Produtos do cardápio
    - `comandas` - Comandas das mesas
    - `itens_comanda` - Itens das comandas
    - `caixas` - Controle de caixa
    - `movimentacoes_caixa` - Movimentações do caixa
    - `vendas` - Registro de vendas
    - `insumos` - Controle de estoque
    - `cardapio_online` - Cardápio online
    - `company_profiles` - Perfis de empresas
    - `employees` - Funcionários
    - `employee_auth` - Autenticação de funcionários
    - `employee_sessions` - Sessões de funcionários
    - `notifications` - Sistema de notificações
    - `audit_logs` - Logs de auditoria
    - `stripe_customers` - Clientes Stripe
    - `stripe_subscriptions` - Assinaturas Stripe
    - `stripe_orders` - Pedidos Stripe

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de segurança apropriadas
    - Triggers para auditoria

  3. Funcionalidades
    - Sistema completo de autenticação
    - Gestão de funcionários
    - Controle de comandas e mesas
    - Sistema de pagamentos
    - Relatórios e dashboard
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  cpf text UNIQUE,
  avatar_url text,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'kitchen', 'waiter', 'cashier', 'stock')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Company profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  address jsonb,
  contact jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Restaurantes table
CREATE TABLE IF NOT EXISTS restaurantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  endereco jsonb,
  configuracoes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;

-- Mesas table
CREATE TABLE IF NOT EXISTS mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  capacidade integer DEFAULT 4,
  status text DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'aguardando')),
  horario_abertura timestamptz,
  garcom text,
  valor_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurante_id, numero)
);

ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

-- Produtos table
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria text NOT NULL,
  disponivel boolean DEFAULT true,
  estoque integer DEFAULT 0,
  estoque_minimo integer DEFAULT 5,
  imagem_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Comandas table
CREATE TABLE IF NOT EXISTS comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id uuid REFERENCES mesas(id) ON DELETE CASCADE,
  status text DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  valor_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

-- Itens comanda table
CREATE TABLE IF NOT EXISTS itens_comanda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid REFERENCES comandas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade integer DEFAULT 1,
  preco_unitario decimal(10,2) NOT NULL,
  observacao text,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE itens_comanda ENABLE ROW LEVEL SECURITY;

-- Caixas table
CREATE TABLE IF NOT EXISTS caixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_inicial decimal(10,2) DEFAULT 0,
  valor_final decimal(10,2),
  valor_sistema decimal(10,2) DEFAULT 0,
  status text DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  data_abertura timestamptz DEFAULT now(),
  data_fechamento timestamptz,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;

-- Movimentações caixa table
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid REFERENCES caixas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor decimal(10,2) NOT NULL,
  motivo text NOT NULL,
  observacao text,
  forma_pagamento text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

-- Vendas table
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  mesa_id uuid REFERENCES mesas(id) ON DELETE SET NULL,
  comanda_id uuid REFERENCES comandas(id) ON DELETE SET NULL,
  valor_total decimal(10,2) NOT NULL,
  forma_pagamento text NOT NULL,
  status text DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Insumos table
CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  unidade_medida text NOT NULL,
  quantidade decimal(10,3) DEFAULT 0,
  quantidade_minima decimal(10,3) DEFAULT 0,
  data_validade date,
  preco_unitario decimal(10,2),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;

-- Cardápio online table
CREATE TABLE IF NOT EXISTS cardapio_online (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria text NOT NULL,
  imagem_url text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  disponivel_online boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cardapio_online ENABLE ROW LEVEL SECURITY;

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'kitchen', 'waiter', 'cashier', 'stock')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, cpf)
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Employee authentication table
CREATE TABLE IF NOT EXISTS employee_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  password_hash text NOT NULL,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id)
);

ALTER TABLE employee_auth ENABLE ROW LEVEL SECURITY;

-- Employee sessions table
CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('order', 'stock', 'payment', 'system')),
  read boolean DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id)
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Stripe subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL UNIQUE,
  subscription_id text,
  price_id text,
  status text NOT NULL DEFAULT 'not_started',
  current_period_start integer,
  current_period_end integer,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Stripe orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text,
  customer_id text NOT NULL,
  amount_subtotal integer,
  amount_total integer,
  currency text,
  payment_status text,
  status text DEFAULT 'pending',
  order_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create view for user subscriptions
CREATE OR REPLACE VIEW stripe_user_subscriptions AS
SELECT 
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

-- Create view for user orders
CREATE OR REPLACE VIEW stripe_user_orders AS
SELECT 
  so.id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status,
  so.order_date
FROM stripe_customers sc
JOIN stripe_orders so ON sc.customer_id = so.customer_id
WHERE sc.deleted_at IS NULL;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Anonymous can check CPF existence"
  ON profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own role"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Company profiles policies
CREATE POLICY "Users can manage own company"
  ON company_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Restaurantes policies
CREATE POLICY "Users can manage own restaurant"
  ON restaurantes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Mesas policies
CREATE POLICY "Restaurant owners can manage mesas"
  ON mesas FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Produtos policies
CREATE POLICY "Restaurant owners can manage produtos"
  ON produtos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Comandas policies
CREATE POLICY "Restaurant owners can manage comandas"
  ON comandas FOR ALL
  TO authenticated
  USING (
    mesa_id IN (
      SELECT m.id FROM mesas m
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

-- Itens comanda policies
CREATE POLICY "Restaurant owners can manage itens_comanda"
  ON itens_comanda FOR ALL
  TO authenticated
  USING (
    comanda_id IN (
      SELECT c.id FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

-- Caixas policies
CREATE POLICY "Restaurant owners can manage caixas"
  ON caixas FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Movimentações caixa policies
CREATE POLICY "Restaurant owners can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    caixa_id IN (
      SELECT c.id FROM caixas c
      JOIN restaurantes r ON c.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

-- Vendas policies
CREATE POLICY "Restaurant owners can manage vendas"
  ON vendas FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Insumos policies
CREATE POLICY "Restaurant owners can manage insumos"
  ON insumos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Cardápio online policies
CREATE POLICY "Restaurant owners can manage cardapio_online"
  ON cardapio_online FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view cardapio_online"
  ON cardapio_online FOR SELECT
  TO anon
  USING (ativo = true AND disponivel_online = true);

-- Employees policies
CREATE POLICY "Company owners can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
  );

-- Employee auth policies
CREATE POLICY "Company owners can manage employee_auth"
  ON employee_auth FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN company_profiles cp ON e.company_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Employee sessions policies
CREATE POLICY "Company owners can manage employee_sessions"
  ON employee_sessions FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN company_profiles cp ON e.company_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Stripe tables policies
CREATE POLICY "Users can manage own stripe_customers"
  ON stripe_customers FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own stripe_subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own stripe_orders"
  ON stripe_orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers WHERE user_id = auth.uid()
    )
  );

-- Functions

-- Function to create employee authentication
CREATE OR REPLACE FUNCTION create_employee_auth(
  p_employee_id uuid,
  p_cpf text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, crypt(p_password, gen_salt('bf')))
  ON CONFLICT (employee_id) 
  DO UPDATE SET 
    password_hash = crypt(p_password, gen_salt('bf')),
    cpf = p_cpf;
END;
$$;

-- Function to authenticate employee
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_cpf text,
  p_password text
)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role text,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.role,
    e.company_id
  FROM employees e
  JOIN employee_auth ea ON e.id = ea.employee_id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND e.active = true;
END;
$$;

-- Triggers

-- Update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables that have updated_at column
DO $$
DECLARE
  table_name text;
  tables_with_updated_at text[] := ARRAY[
    'profiles', 'user_roles', 'company_profiles', 'restaurantes', 
    'mesas', 'produtos', 'comandas', 'itens_comanda', 'caixas', 
    'insumos', 'cardapio_online', 'employees'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_with_updated_at
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update comanda total when items change
CREATE OR REPLACE FUNCTION update_comanda_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comandas 
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
    FROM itens_comanda 
    WHERE comanda_id = COALESCE(NEW.comanda_id, OLD.comanda_id)
  )
  WHERE id = COALESCE(NEW.comanda_id, OLD.comanda_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comanda_total_trigger ON itens_comanda;
CREATE TRIGGER update_comanda_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON itens_comanda
  FOR EACH ROW EXECUTE FUNCTION update_comanda_total();

-- Trigger to update mesa total when comanda changes
CREATE OR REPLACE FUNCTION update_mesa_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mesas 
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM comandas 
    WHERE mesa_id = COALESCE(NEW.mesa_id, OLD.mesa_id)
      AND status = 'aberta'
  )
  WHERE id = COALESCE(NEW.mesa_id, OLD.mesa_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mesa_total_trigger ON comandas;
CREATE TRIGGER update_mesa_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON comandas
  FOR EACH ROW EXECUTE FUNCTION update_mesa_total();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mesas_restaurante_id ON mesas(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_mesas_status ON mesas(status);
CREATE INDEX IF NOT EXISTS idx_produtos_restaurante_id ON produtos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_comandas_mesa_id ON comandas(mesa_id);
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_itens_comanda_comanda_id ON itens_comanda(comanda_id);
CREATE INDEX IF NOT EXISTS idx_itens_comanda_produto_id ON itens_comanda(produto_id);
CREATE INDEX IF NOT EXISTS idx_itens_comanda_status ON itens_comanda(status);
CREATE INDEX IF NOT EXISTS idx_vendas_restaurante_id ON vendas(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_insumos_restaurante_id ON insumos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_token ON employee_sessions(token);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires_at ON employee_sessions(expires_at);

-- Insert default data for testing
DO $$
DECLARE
  test_user_id uuid;
  test_restaurante_id uuid;
  test_mesa_id uuid;
  test_produto_id uuid;
  test_comanda_id uuid;
BEGIN
  -- Check if we have any users first
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Insert default restaurant if none exists
    INSERT INTO restaurantes (user_id, nome, telefone)
    VALUES (test_user_id, 'Restaurante Teste', '(11) 99999-9999')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO test_restaurante_id;
    
    -- Get restaurant ID if it already exists
    IF test_restaurante_id IS NULL THEN
      SELECT id INTO test_restaurante_id FROM restaurantes WHERE user_id = test_user_id;
    END IF;
    
    -- Insert default mesas
    INSERT INTO mesas (restaurante_id, numero, capacidade, status)
    VALUES 
      (test_restaurante_id, 1, 4, 'livre'),
      (test_restaurante_id, 2, 2, 'livre'),
      (test_restaurante_id, 3, 6, 'livre')
    ON CONFLICT (restaurante_id, numero) DO NOTHING;
    
    -- Insert default produtos
    INSERT INTO produtos (restaurante_id, nome, descricao, preco, categoria, disponivel, estoque, estoque_minimo)
    VALUES 
      (test_restaurante_id, 'Picanha Grelhada', 'Suculenta picanha grelhada na brasa', 159.90, 'Menu Principal', true, 15, 5),
      (test_restaurante_id, 'Frango à Parmegiana', 'Peito de frango empanado com molho e queijo', 89.90, 'Menu Principal', true, 20, 5),
      (test_restaurante_id, 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Fanta', 7.90, 'Bebidas', true, 50, 10),
      (test_restaurante_id, 'Brownie com Sorvete', 'Brownie caseiro com sorvete de creme', 28.90, 'Sobremesas', true, 10, 3)
    ON CONFLICT DO NOTHING;
    
    -- Insert default insumos
    INSERT INTO insumos (restaurante_id, nome, descricao, unidade_medida, quantidade, quantidade_minima, preco_unitario)
    VALUES 
      (test_restaurante_id, 'Picanha', 'Carne bovina premium', 'kg', 5, 10, 45.90),
      (test_restaurante_id, 'Arroz', 'Arroz branco tipo 1', 'kg', 15, 20, 8.50),
      (test_restaurante_id, 'Coca-Cola Lata', 'Refrigerante 350ml', 'un', 24, 50, 3.50),
      (test_restaurante_id, 'Queijo Muçarela', 'Queijo para gratinar', 'kg', 2, 5, 28.90)
    ON CONFLICT DO NOTHING;
    
    -- Insert cardapio online items
    INSERT INTO cardapio_online (restaurante_id, nome, descricao, preco, categoria, ordem, ativo, disponivel_online)
    VALUES 
      (test_restaurante_id, 'Picanha Grelhada', 'Suculenta picanha grelhada na brasa, acompanhada de arroz, farofa especial, vinagrete e pão de alho. Serve 2 pessoas.', 159.90, 'Menu Principal', 1, true, true),
      (test_restaurante_id, 'Frango à Parmegiana', 'Peito de frango empanado coberto com molho de tomate caseiro, queijo muçarela gratinado e manjericão fresco. Acompanha arroz e fritas.', 89.90, 'Menu Principal', 2, true, true),
      (test_restaurante_id, 'Mini Hambúrguer com Batata', 'Dois deliciosos mini hambúrgueres de carne bovina, queijo cheddar, alface e tomate. Acompanha porção de batatas fritas crocantes.', 45.90, 'Menu Kids', 3, true, true),
      (test_restaurante_id, 'Refrigerante Lata', 'Coca-Cola, Guaraná Antarctica, Fanta ou Sprite. Lata 350ml gelada.', 7.90, 'Bebidas', 4, true, true),
      (test_restaurante_id, 'Brownie com Sorvete', 'Brownie caseiro quentinho com sorvete de creme, calda de chocolate e chantilly.', 28.90, 'Sobremesas', 5, true, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;