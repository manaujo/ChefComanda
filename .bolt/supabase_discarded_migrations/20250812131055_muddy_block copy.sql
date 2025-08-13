/*
  # Fix RLS Policies and Constraints for Cash Register System

  1. Changes
    - Drop old RLS policy for movimentacoes_caixa that references old caixa_id
    - Create new RLS policy for movimentacoes_caixa that references caixa_operador_id
    - Close any duplicate open cash registers to prevent conflicts
    - Add unique partial index to prevent multiple open cash registers per restaurant

  2. Security
    - Updated RLS policy for movimentacoes_caixa table
    - Maintains data integrity with unique constraints

  3. Data Cleanup
    - Closes duplicate open cash registers before applying constraints
*/

-- First, close any duplicate open cash registers to prevent constraint violations
-- Keep only the most recent one open for each restaurant
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Find restaurants with multiple open cash registers
  FOR duplicate_record IN 
    SELECT 
      restaurante_id,
      array_agg(id ORDER BY data_abertura DESC) as caixa_ids
    FROM caixas_operadores 
    WHERE status = 'aberto'
    GROUP BY restaurante_id
    HAVING COUNT(*) > 1
  LOOP
    -- Close all but the most recent one
    UPDATE caixas_operadores 
    SET 
      status = 'fechado',
      data_fechamento = now(),
      observacao = COALESCE(observacao || ' - ', '') || 'Fechado automaticamente para resolver duplicatas'
    WHERE id = ANY(duplicate_record.caixa_ids[2:]);
  END LOOP;
END $$;

-- Drop the old RLS policy for movimentacoes_caixa
DROP POLICY IF EXISTS "Restaurant owners can manage movimentacoes_caixa" ON movimentacoes_caixa;

-- Create new RLS policy for movimentacoes_caixa that works with caixa_operador_id
CREATE POLICY "Restaurant owners can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    -- Allow access if using old caixa_id system
    (caixa_id IS NOT NULL AND caixa_id IN (
      SELECT c.id FROM caixas c
      JOIN restaurantes r ON c.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    ))
    OR
    -- Allow access if using new caixa_operador_id system
    (caixa_operador_id IS NOT NULL AND caixa_operador_id IN (
      SELECT co.id FROM caixas_operadores co
      JOIN restaurantes r ON co.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    ))
  );

-- Add unique partial index to prevent multiple open cash registers per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_caixa_per_restaurant 
ON caixas_operadores (restaurante_id) 
WHERE status = 'aberto';

-- Add foreign key constraint for caixa_operador_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'movimentacoes_caixa_caixa_operador_id_fkey'
  ) THEN
    ALTER TABLE movimentacoes_caixa 
    ADD CONSTRAINT movimentacoes_caixa_caixa_operador_id_fkey 
    FOREIGN KEY (caixa_operador_id) REFERENCES caixas_operadores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance on caixa_operador_id
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_operador_id ON movimentacoes_caixa(caixa_operador_id);