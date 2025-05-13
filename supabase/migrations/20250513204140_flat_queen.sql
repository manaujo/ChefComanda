/*
  # Inventory Management Schema

  1. New Tables
    - `insumos` (ingredients/supplies)
      - Basic product information
      - Stock tracking
      - Expiration date tracking
    
    - `movimentacoes_estoque` (inventory movements)
      - Track all inventory changes
      - Record reasons and quantities
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create inventory items table
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

-- Create inventory movements table
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

-- Enable RLS
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Policies for inventory items
CREATE POLICY "Users can view restaurant inventory"
  ON insumos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = insumos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage restaurant inventory"
  ON insumos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = insumos.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Policies for inventory movements
CREATE POLICY "Users can view restaurant inventory movements"
  ON movimentacoes_estoque FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insumos
      JOIN restaurantes ON restaurantes.id = insumos.restaurante_id
      WHERE insumos.id = movimentacoes_estoque.insumo_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inventory movements"
  ON movimentacoes_estoque FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insumos
      JOIN restaurantes ON restaurantes.id = insumos.restaurante_id
      WHERE insumos.id = movimentacoes_estoque.insumo_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Function to update stock quantity after movement
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

-- Trigger to update stock quantity
CREATE TRIGGER update_stock_trigger
AFTER INSERT ON movimentacoes_estoque
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_movement();