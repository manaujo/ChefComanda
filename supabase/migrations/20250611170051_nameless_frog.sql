/*
  # Fix produtos table schema

  1. Changes
    - Add missing restaurante_id column to produtos table
    - Update RLS policies for produtos table
    - Ensure proper foreign key relationship

  2. Security
    - Maintain RLS policies for data isolation
*/

-- Add restaurante_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'restaurante_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN restaurante_id uuid REFERENCES restaurantes NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Ensure the column is properly constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'produtos' 
    AND kcu.column_name = 'restaurante_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE produtos 
    ADD CONSTRAINT produtos_restaurante_id_fkey 
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
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

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS produtos_restaurante_id_idx ON produtos (restaurante_id);