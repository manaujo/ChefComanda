/*
  # Complete Restaurant Management Schema

  1. New Tables
    - `mesas` - Restaurant tables management
    - `produtos` - Menu products
    - `comandas` - Orders/tickets
    - `itens_comanda` - Order items
    - `caixas` - Cash register sessions
    - `movimentacoes_caixa` - Cash movements
    - `vendas` - Sales records
    - `audit_logs` - System audit logs

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Ensure data isolation between restaurants
*/

-- Create mesas (tables) table
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

-- Create produtos (products) table
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

-- Create comandas (orders) table
CREATE TABLE IF NOT EXISTS comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id uuid REFERENCES mesas NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  valor_total decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create itens_comanda (order items) table
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

-- Create caixas (cash register) table
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

-- Create movimentacoes_caixa (cash movements) table
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

-- Create vendas (sales) table
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

-- Create audit_logs table
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

-- Enable RLS on all tables
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_comanda ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can manage restaurant tables" ON mesas;
CREATE POLICY "Users can manage restaurant tables"
  ON mesas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = mesas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage restaurant products" ON produtos;
CREATE POLICY "Users can manage restaurant products"
  ON produtos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = produtos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage restaurant orders" ON comandas;
CREATE POLICY "Users can manage restaurant orders"
  ON comandas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mesas
      JOIN restaurantes ON restaurantes.id = mesas.restaurante_id
      WHERE mesas.id = comandas.mesa_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage order items" ON itens_comanda;
CREATE POLICY "Users can manage order items"
  ON itens_comanda FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM comandas
      JOIN mesas ON mesas.id = comandas.mesa_id
      JOIN restaurantes ON restaurantes.id = mesas.restaurante_id
      WHERE comandas.id = itens_comanda.comanda_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage restaurant cash registers" ON caixas;
CREATE POLICY "Users can manage restaurant cash registers"
  ON caixas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = caixas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage cash movements" ON movimentacoes_caixa;
CREATE POLICY "Users can manage cash movements"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caixas
      JOIN restaurantes ON restaurantes.id = caixas.restaurante_id
      WHERE caixas.id = movimentacoes_caixa.caixa_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage restaurant sales" ON vendas;
CREATE POLICY "Users can manage restaurant sales"
  ON vendas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = vendas.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
CREATE POLICY "Users can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Functions to update totals
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

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_comanda_total_trigger ON itens_comanda;
CREATE TRIGGER update_comanda_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON itens_comanda
FOR EACH ROW
EXECUTE FUNCTION update_comanda_total();

DROP TRIGGER IF EXISTS update_mesa_total_trigger ON comandas;
CREATE TRIGGER update_mesa_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON comandas
FOR EACH ROW
EXECUTE FUNCTION update_mesa_total();

-- Create indexes for performance (using IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'mesas_restaurante_id_idx') THEN
    CREATE INDEX mesas_restaurante_id_idx ON mesas (restaurante_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'produtos_restaurante_id_idx') THEN
    CREATE INDEX produtos_restaurante_id_idx ON produtos (restaurante_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'comandas_mesa_id_idx') THEN
    CREATE INDEX comandas_mesa_id_idx ON comandas (mesa_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'itens_comanda_comanda_id_idx') THEN
    CREATE INDEX itens_comanda_comanda_id_idx ON itens_comanda (comanda_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'caixas_restaurante_id_idx') THEN
    CREATE INDEX caixas_restaurante_id_idx ON caixas (restaurante_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vendas_restaurante_id_idx') THEN
    CREATE INDEX vendas_restaurante_id_idx ON vendas (restaurante_id);
  END IF;
END $$;