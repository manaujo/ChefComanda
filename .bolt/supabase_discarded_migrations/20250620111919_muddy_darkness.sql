/*
  # Schema Completo ChefComanda

  1. Tabelas Principais
    - usuarios (com enum de roles)
    - restaurantes
    - mesas
    - produtos
    - comandas
    - itens_comanda
    - caixas
    - movimentacoes_caixa
    - vendas
    - insumos
    - movimentacoes_estoque
    - cardapio_online
    
  2. Tabelas de Gestão
    - company_profiles
    - employees
    - employee_auth
    - employee_sessions
    - profiles
    - user_roles
    - notifications
    - audit_logs
    
  3. Tabelas de Assinatura
    - planos
    - assinaturas
    - subscriptions
    - faturas

  4. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para isolamento de dados
    - Funções para autenticação de funcionários
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum para roles de usuário
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'kitchen', 'waiter', 'cashier', 'stock');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABELAS DE USUÁRIOS E PERFIS
-- =============================================

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  avatar_url text,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de roles de usuário
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

-- Tabela de perfis de empresa
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  cnpj text NOT NULL,
  address jsonb,
  contact jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT company_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT company_profiles_cnpj_key UNIQUE (cnpj)
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles NOT NULL,
  name text NOT NULL,
  cpf text NOT NULL,
  role user_role NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT employees_cpf_key UNIQUE (cpf)
);

-- Tabela de autenticação de funcionários
CREATE TABLE IF NOT EXISTS employee_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  cpf text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de sessões de funcionários
CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABELAS DE PLANOS E ASSINATURAS
-- =============================================

-- Tabela de planos
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

-- Tabela de restaurantes
CREATE TABLE IF NOT EXISTS restaurantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT restaurantes_user_id_key UNIQUE (user_id)
);

-- Tabela de assinaturas
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

-- Tabela de assinaturas Stripe
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  plan_id text NOT NULL,
  status text NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de faturas
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

-- =============================================
-- TABELAS DO RESTAURANTE
-- =============================================

-- Tabela de mesas
CREATE TABLE IF NOT EXISTS mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  numero int NOT NULL,
  capacidade int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'aguardando')),
  horario_abertura timestamptz,
  garcom text,
  valor_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT mesas_restaurante_numero_key UNIQUE (restaurante_id, numero)
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria text NOT NULL,
  disponivel boolean DEFAULT true,
  estoque int DEFAULT 0,
  estoque_minimo int DEFAULT 5,
  imagem_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de comandas
CREATE TABLE IF NOT EXISTS comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id uuid REFERENCES mesas NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  valor_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de itens de comanda
CREATE TABLE IF NOT EXISTS itens_comanda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid REFERENCES comandas NOT NULL,
  produto_id uuid REFERENCES produtos NOT NULL,
  quantidade int NOT NULL DEFAULT 1,
  preco_unitario decimal(10,2) NOT NULL,
  observacao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de caixas
CREATE TABLE IF NOT EXISTS caixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  usuario_id uuid REFERENCES auth.users NOT NULL,
  valor_inicial decimal(10,2) NOT NULL DEFAULT 0,
  valor_final decimal(10,2),
  valor_sistema decimal(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  data_abertura timestamptz DEFAULT now(),
  data_fechamento timestamptz,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid REFERENCES caixas NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor decimal(10,2) NOT NULL,
  motivo text NOT NULL,
  observacao text,
  forma_pagamento text,
  usuario_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  mesa_id uuid REFERENCES mesas,
  comanda_id uuid REFERENCES comandas,
  valor_total decimal(10,2) NOT NULL,
  forma_pagamento text NOT NULL,
  status text NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  usuario_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABELAS DE ESTOQUE
-- =============================================

-- Tabela de insumos
CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  nome text NOT NULL,
  descricao text,
  unidade_medida text NOT NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 0,
  quantidade_minima numeric(10,2) NOT NULL DEFAULT 0,
  data_validade date,
  preco_unitario numeric(10,2),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid REFERENCES insumos NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade numeric(10,2) NOT NULL,
  motivo text NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- =============================================
-- TABELAS DE CARDÁPIO ONLINE
-- =============================================

-- Tabela de cardápio online
CREATE TABLE IF NOT EXISTS cardapio_online (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria text NOT NULL,
  imagem_url text,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  disponivel_online boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- TABELAS DE NOTIFICAÇÕES E AUDITORIA
-- =============================================

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_comanda ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_online ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Políticas para company_profiles
CREATE POLICY "Users can view own company profile" ON company_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own company profile" ON company_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own company profile" ON company_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Políticas para employees
CREATE POLICY "Companies can manage their employees" ON employees
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM company_profiles
      WHERE company_profiles.id = employees.company_id
      AND company_profiles.user_id = auth.uid()
    )
  );

-- Políticas para planos (visível para todos)
CREATE POLICY "Plans viewable by all authenticated users" ON planos
  FOR SELECT TO authenticated USING (true);

-- Políticas para restaurantes
CREATE POLICY "Users can view own restaurant" ON restaurantes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own restaurant" ON restaurantes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own restaurant" ON restaurantes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Políticas para mesas
CREATE POLICY "Users can manage restaurant tables" ON mesas
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = mesas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para produtos
CREATE POLICY "Users can manage restaurant products" ON produtos
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = produtos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para comandas
CREATE POLICY "Users can manage restaurant orders" ON comandas
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM mesas
      JOIN restaurantes ON restaurantes.id = mesas.restaurante_id
      WHERE mesas.id = comandas.mesa_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para itens_comanda
CREATE POLICY "Users can manage order items" ON itens_comanda
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM comandas
      JOIN mesas ON mesas.id = comandas.mesa_id
      JOIN restaurantes ON restaurantes.id = mesas.restaurante_id
      WHERE comandas.id = itens_comanda.comanda_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para caixas
CREATE POLICY "Users can manage restaurant cash registers" ON caixas
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = caixas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para movimentacoes_caixa
CREATE POLICY "Users can manage cash movements" ON movimentacoes_caixa
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM caixas
      JOIN restaurantes ON restaurantes.id = caixas.restaurante_id
      WHERE caixas.id = movimentacoes_caixa.caixa_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para vendas
CREATE POLICY "Users can manage restaurant sales" ON vendas
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = vendas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para insumos
CREATE POLICY "Users can view restaurant inventory" ON insumos
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = insumos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage restaurant inventory" ON insumos
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = insumos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para movimentacoes_estoque
CREATE POLICY "Users can view restaurant inventory movements" ON movimentacoes_estoque
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM insumos
      JOIN restaurantes ON restaurantes.id = insumos.restaurante_id
      WHERE insumos.id = movimentacoes_estoque.insumo_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inventory movements" ON movimentacoes_estoque
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM insumos
      JOIN restaurantes ON restaurantes.id = insumos.restaurante_id
      WHERE insumos.id = movimentacoes_estoque.insumo_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para cardapio_online
CREATE POLICY "Users can view restaurant menu items" ON cardapio_online
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = cardapio_online.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage restaurant menu items" ON cardapio_online
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = cardapio_online.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Políticas para notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Políticas para audit_logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNÇÕES E TRIGGERS
-- =============================================

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Função para atualizar total da comanda
CREATE OR REPLACE FUNCTION update_comanda_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE comandas
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
    FROM itens_comanda
    WHERE comanda_id = COALESCE(NEW.comanda_id, OLD.comanda_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.comanda_id, OLD.comanda_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar total da mesa
CREATE OR REPLACE FUNCTION update_mesa_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mesas
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM comandas
    WHERE mesa_id = COALESCE(NEW.mesa_id, OLD.mesa_id)
    AND status = 'aberta'
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.mesa_id, OLD.mesa_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estoque após movimentação
CREATE OR REPLACE FUNCTION update_stock_after_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE insumos
    SET quantidade = quantidade + NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.insumo_id;
  ELSE
    UPDATE insumos
    SET quantidade = quantidade - NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar autenticação de funcionário
CREATE OR REPLACE FUNCTION create_employee_auth(
  p_employee_id uuid,
  p_cpf text,
  p_password text
)
RETURNS uuid AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_auth_id;
  
  RETURN v_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para autenticar funcionário
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_cpf text,
  p_password text
)
RETURNS TABLE(employee_id uuid, company_id uuid, name text, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.company_id,
    e.name,
    e.role
  FROM employees e
  JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND ea.active = true
    AND e.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar total da comanda
DROP TRIGGER IF EXISTS update_comanda_total_trigger ON itens_comanda;
CREATE TRIGGER update_comanda_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON itens_comanda
FOR EACH ROW
EXECUTE FUNCTION update_comanda_total();

-- Trigger para atualizar total da mesa
DROP TRIGGER IF EXISTS update_mesa_total_trigger ON comandas;
CREATE TRIGGER update_mesa_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON comandas
FOR EACH ROW
EXECUTE FUNCTION update_mesa_total();

-- Trigger para atualizar estoque
DROP TRIGGER IF EXISTS update_stock_trigger ON movimentacoes_estoque;
CREATE TRIGGER update_stock_trigger
AFTER INSERT ON movimentacoes_estoque
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_movement();

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS mesas_restaurante_id_idx ON mesas (restaurante_id);
CREATE INDEX IF NOT EXISTS produtos_restaurante_id_idx ON produtos (restaurante_id);
CREATE INDEX IF NOT EXISTS comandas_mesa_id_idx ON comandas (mesa_id);
CREATE INDEX IF NOT EXISTS itens_comanda_comanda_id_idx ON itens_comanda (comanda_id);
CREATE INDEX IF NOT EXISTS caixas_restaurante_id_idx ON caixas (restaurante_id);
CREATE INDEX IF NOT EXISTS vendas_restaurante_id_idx ON vendas (restaurante_id);
CREATE INDEX IF NOT EXISTS insumos_restaurante_id_idx ON insumos (restaurante_id);
CREATE INDEX IF NOT EXISTS cardapio_online_ordem_idx ON cardapio_online (restaurante_id, ordem);
CREATE INDEX IF NOT EXISTS company_profiles_user_id_idx ON company_profiles (user_id);

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Inserir planos padrão
INSERT INTO planos (nome, descricao, preco, limite_mesas, recursos) VALUES
(
  'Starter',
  'Sistema de Ponto de venda e estoque',
  40.00,
  5,
  '{"relatorios_avancados": false, "estoque": true, "impressao_cozinha": false}'
),
(
  'Básico',
  'Ideal para começar',
  60.90,
  10,
  '{"relatorios_avancados": false, "estoque": true, "impressao_cozinha": true}'
),
(
  'Profissional',
  'Mais completo',
  85.90,
  20,
  '{"relatorios_avancados": true, "estoque": true, "impressao_cozinha": true}'
)
ON CONFLICT DO NOTHING;

-- Criar usuário administrador padrão
DO $$
DECLARE
  _user_id uuid;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO _user_id FROM auth.users WHERE email = 'adm.mesa04@gmail.com';
  
  IF _user_id IS NULL THEN
    -- Criar usuário admin
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change_token_current
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'adm.mesa04@gmail.com',
      crypt('123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Administrador","is_fixed":true}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO _user_id;

    -- Adicionar role de admin
    INSERT INTO user_roles (user_id, role)
    VALUES (_user_id, 'admin');
  END IF;
END $$;