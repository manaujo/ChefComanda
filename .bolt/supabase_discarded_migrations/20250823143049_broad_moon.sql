/*
  # Fix Ambiguous Column Reference in movimentacoes_caixa RLS Policy

  1. Problem Fixed
    - Ambiguous "restaurant_id" column reference in RLS policy
    - Multiple tables (caixas, caixas_operadores) have restaurant_id columns
    - Database cannot determine which restaurant_id to use

  2. Solution
    - Replace existing RLS policy with explicit EXISTS clauses
    - Each subquery is self-contained and unambiguous
    - Prevents multiple restaurant_id columns in same evaluation context

  3. Security
    - Maintain same access control logic
    - Restaurant owners can manage their movements
    - Operators can manage their own movements
*/

-- Drop the existing ambiguous policy
DROP POLICY IF EXISTS "Restaurant owners and operators can manage movimentacoes_caixa" ON movimentacoes_caixa;

-- Create new unambiguous policy with explicit EXISTS clauses
CREATE POLICY "Restaurant owners and operators can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
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
  RAISE NOTICE 'Fixed ambiguous restaurant_id column reference in movimentacoes_caixa RLS policy';
  RAISE NOTICE 'Cash movements should now load correctly without database errors';
END $$;