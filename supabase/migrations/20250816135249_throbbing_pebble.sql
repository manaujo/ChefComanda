/*
  # Fix Ambiguous Column Reference in get_employee_restaurant Function

  1. Changes
    - Drop existing get_employee_restaurant function first
    - Recreate with properly prefixed parameter and variable names
    - This resolves the ambiguous column reference error in RLS policies

  2. Security
    - Maintains existing RLS policies functionality
    - No changes to security model
*/

-- Drop the existing function first to allow parameter name change
DROP FUNCTION IF EXISTS get_employee_restaurant(uuid);

-- Recreate the function with properly prefixed names
CREATE OR REPLACE FUNCTION get_employee_restaurant(p_employee_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  -- Buscar restaurante através do funcionário
  SELECT e.restaurant_id INTO v_restaurant_id
  FROM employees e
  WHERE e.auth_user_id = p_employee_user_id
    AND e.active = true;
  
  RETURN v_restaurant_id;
END;
$$;