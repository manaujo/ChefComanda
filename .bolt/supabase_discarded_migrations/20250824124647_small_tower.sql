/*
  # Fix RLS Policy to Allow Cash Movement Insertion

  1. Problem Fixed
    - Users cannot insert new cash movements due to RLS policy restriction
    - Current policy only handles read permissions, not insert permissions
    - Error: "new row violates row-level security policy for table movimentacoes_caixa"

  2. Solution
    - Update RLS policy to explicitly allow users to insert their own movements
    - Add condition: movimentacoes_caixa.usuario_id = auth.uid()
    - Maintain all existing read permissions

  3. Security
    - Users can only insert movements where they are the usuario_id
    - All existing read permissions remain intact
    - Restaurant owners and operators maintain their access levels
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Restaurant owners and operators can manage movimentacoes_caixa" ON movimentacoes_caixa;

-- Create updated policy with insert permissions
CREATE POLICY "Restaurant owners and operators can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    -- Allow users to insert/update their own movements
    movimentacoes_caixa.usuario_id = auth.uid()
    OR
    -- Condition 1: Movement belongs to a restaurant owned by the current user (via caixa_operador_id)
    EXISTS (
      SELECT 1
      FROM caixas_operadores co
      JOIN restaurantes r ON co.restaurante_id = r.id
      WHERE co.id = movimentacoes_caixa.caixa_operador_id
        AND r.user_id = auth.uid()
    )
    OR
    -- Condition 2: Movement belongs to a restaurant owned by the current user (via old caixa_id)
    EXISTS (
      SELECT 1
      FROM caixas c
      JOIN restaurantes r ON c.restaurante_id = r.id
      WHERE c.id = movimentacoes_caixa.caixa_id
        AND r.user_id = auth.uid()
    )
    OR
    -- Condition 3: Current user is the operator of the caixa_operador associated with the movement
    EXISTS (
      SELECT 1
      FROM caixas_operadores co
      WHERE co.id = movimentacoes_caixa.caixa_operador_id
        AND co.operador_id = auth.uid()
    )
  );

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'Updated RLS policy to allow cash movement insertion';
  RAISE NOTICE 'Users can now insert movements where usuario_id = auth.uid()';
END $$;