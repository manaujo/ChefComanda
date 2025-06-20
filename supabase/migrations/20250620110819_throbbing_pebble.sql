/*
  # Fix produtos table - Add missing restaurante_id column
  
  1. Changes
    - Add restaurante_id column to produtos table
    - Add foreign key constraint
    - Update RLS policies
    - Create performance index
  
  2. Security
    - Maintain RLS policies for data isolation
*/

-- Add restaurante_id column to produtos table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'restaurante_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN restaurante_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'produtos_restaurante_id_fkey'
    AND table_name = 'produtos'
  ) THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_restaurante_id_fkey 
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
  END IF;
END $$;

-- Update any existing rows to have a valid restaurante_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' 
    AND column_name = 'restaurante_id'
  ) THEN
    -- Update NULL values with the first available restaurante
    UPDATE produtos 
    SET restaurante_id = (SELECT id FROM restaurantes LIMIT 1)
    WHERE restaurante_id IS NULL;
  END IF;
END $$;

-- Make the column NOT NULL if it exists and is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' 
    AND column_name = 'restaurante_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE produtos ALTER COLUMN restaurante_id SET NOT NULL;
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'produtos_restaurante_id_idx'
  ) THEN
    CREATE INDEX produtos_restaurante_id_idx ON produtos (restaurante_id);
  END IF;
END $$;