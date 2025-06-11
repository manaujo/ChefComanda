/*
  # Fix missing restaurante_id column in mesas table

  1. Changes
    - Add restaurante_id column to mesas table if it doesn't exist
    - Add foreign key constraint to restaurantes table
    - Update existing policies to work with the new column structure

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with foreign key constraints
*/

-- Add restaurante_id column to mesas table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mesas' AND column_name = 'restaurante_id'
  ) THEN
    ALTER TABLE mesas ADD COLUMN restaurante_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mesas_restaurante_id_fkey'
    AND table_name = 'mesas'
  ) THEN
    ALTER TABLE mesas ADD CONSTRAINT mesas_restaurante_id_fkey 
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
  END IF;
END $$;

-- Make restaurante_id NOT NULL if it exists and is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mesas' 
    AND column_name = 'restaurante_id'
    AND is_nullable = 'YES'
  ) THEN
    -- First, update any NULL values with a default restaurante if needed
    -- This assumes you have at least one restaurante in your system
    UPDATE mesas 
    SET restaurante_id = (SELECT id FROM restaurantes LIMIT 1)
    WHERE restaurante_id IS NULL;
    
    -- Then make the column NOT NULL
    ALTER TABLE mesas ALTER COLUMN restaurante_id SET NOT NULL;
  END IF;
END $$;

-- Recreate the unique constraint for restaurante_id and numero if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mesas_restaurante_numero_key'
    AND table_name = 'mesas'
  ) THEN
    ALTER TABLE mesas ADD CONSTRAINT mesas_restaurante_numero_key 
    UNIQUE (restaurante_id, numero);
  END IF;
END $$;

-- Recreate index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'mesas_restaurante_id_idx'
  ) THEN
    CREATE INDEX mesas_restaurante_id_idx ON mesas (restaurante_id);
  END IF;
END $$;

-- Ensure RLS policy exists and is correct
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