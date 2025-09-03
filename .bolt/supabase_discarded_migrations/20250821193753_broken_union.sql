/*
  # Fix Foreign Key Relationship for movimentacoes_estoque

  1. Problem
    - movimentacoes_estoque.usuario_id references auth.users(id)
    - Query tries to join with profiles table directly
    - Supabase can't find relationship between movimentacoes_estoque and profiles

  2. Solution
    - Drop existing foreign key constraint to auth.users
    - Add new foreign key constraint to profiles table
    - This allows direct joins with profiles table in queries

  3. Data Integrity
    - Ensure all existing usuario_id values exist in profiles table
    - Update any orphaned records before applying new constraint
*/

-- First, ensure all usuario_id values exist in profiles table
-- Insert missing profiles for any usuario_id that doesn't exist
INSERT INTO profiles (id, name)
SELECT DISTINCT me.usuario_id, 'Usuário'
FROM movimentacoes_estoque me
WHERE me.usuario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = me.usuario_id
  )
ON CONFLICT (id) DO NOTHING;

-- Drop the existing foreign key constraint to auth.users
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'movimentacoes_estoque_usuario_id_fkey'
    AND table_name = 'movimentacoes_estoque'
  ) THEN
    ALTER TABLE movimentacoes_estoque 
    DROP CONSTRAINT movimentacoes_estoque_usuario_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint to profiles table
ALTER TABLE movimentacoes_estoque 
ADD CONSTRAINT movimentacoes_estoque_usuario_id_fkey 
FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_usuario_id 
ON movimentacoes_estoque(usuario_id);

-- Update the registrar_movimentacao_estoque function to handle the new relationship
CREATE OR REPLACE FUNCTION registrar_movimentacao_estoque(
  p_insumo_id uuid,
  p_tipo text,
  p_quantidade decimal,
  p_motivo text,
  p_observacao text DEFAULT NULL,
  p_usuario_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insumo RECORD;
  v_nova_quantidade decimal;
  v_restaurante_id uuid;
BEGIN
  -- Buscar dados do insumo
  SELECT * INTO v_insumo
  FROM insumos
  WHERE id = p_insumo_id AND ativo = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo não encontrado ou inativo';
  END IF;
  
  v_restaurante_id := v_insumo.restaurante_id;
  
  -- Calcular nova quantidade
  IF p_tipo = 'entrada' THEN
    v_nova_quantidade := v_insumo.quantidade + p_quantidade;
  ELSE
    v_nova_quantidade := v_insumo.quantidade - p_quantidade;
    
    -- Verificar se há quantidade suficiente
    IF v_nova_quantidade < 0 THEN
      RAISE EXCEPTION 'Quantidade insuficiente em estoque. Disponível: % %', 
        v_insumo.quantidade, v_insumo.unidade_medida;
    END IF;
  END IF;
  
  -- Ensure user profile exists before inserting movement
  INSERT INTO profiles (id, name)
  VALUES (p_usuario_id, 'Usuário')
  ON CONFLICT (id) DO NOTHING;
  
  -- Registrar movimentação
  INSERT INTO movimentacoes_estoque (
    restaurante_id,
    insumo_id,
    tipo,
    quantidade,
    quantidade_anterior,
    quantidade_atual,
    motivo,
    observacao,
    usuario_id
  ) VALUES (
    v_restaurante_id,
    p_insumo_id,
    p_tipo,
    p_quantidade,
    v_insumo.quantidade,
    v_nova_quantidade,
    p_motivo,
    p_observacao,
    p_usuario_id
  );
  
  -- Atualizar quantidade do insumo
  UPDATE insumos 
  SET 
    quantidade = v_nova_quantidade,
    updated_at = now()
  WHERE id = p_insumo_id;
END;
$$;