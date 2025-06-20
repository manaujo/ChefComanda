/*
  # Add CPF column to profiles table

  1. Changes
    - Add `cpf` column to `profiles` table
    - Set column as nullable text type
    - Add unique constraint to prevent duplicate CPF values
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as existing policies will cover the new column
*/

-- Add CPF column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cpf text;
  END IF;
END $$;

-- Add unique constraint for CPF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_cpf_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);
  END IF;
END $$;

-- Add index for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'profiles_cpf_idx'
  ) THEN
    CREATE INDEX profiles_cpf_idx ON profiles (cpf);
  END IF;
END $$;