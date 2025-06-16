/*
  # Fix User Roles Enum

  1. Changes
    - Update user_role enum to include all required roles
    - Add cashier and stock roles
    - Update existing data

  2. Security
    - Maintain existing RLS policies
*/

-- Create new enum with all roles
CREATE TYPE user_role_new AS ENUM ('admin', 'kitchen', 'waiter', 'cashier', 'stock');

-- Update the column to use the new enum
ALTER TABLE user_roles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Drop old enum and rename new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Update employees table to use the same enum
ALTER TABLE employees ALTER COLUMN role TYPE user_role USING role::text::user_role;