/*
  # Fix produtos table - Add missing restaurante_id column
  
  This SQL should be run manually in your Supabase SQL Editor to fix the missing column.
  
  1. Changes
    - Add restaurante_id column to produtos table
    - Add foreign key constraint
    - Update RLS policies
    - Create performance index
  
  2. Security
    - Maintain RLS policies for data isolation
*/

-- Add restaurante_id column to produtos table
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS restaurante_id uuid;

-- Add foreign key constraint
ALTER TABLE produtos 
ADD CONSTRAINT IF NOT EXISTS produtos_restaurante_id_fkey 
FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);

-- Make the column NOT NULL (after adding the constraint)
-- First, update any existing rows to have a valid restaurante_id
-- You may need to adjust this based on your data
UPDATE produtos 
SET restaurante_id = (SELECT id FROM restaurantes LIMIT 1)
WHERE restaurante_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE produtos ALTER COLUMN restaurante_id SET NOT NULL;

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS produtos_restaurante_id_idx ON produtos (restaurante_id);