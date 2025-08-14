/*
  # Fix Ambiguous Column Reference in is_restaurant_employee Function

  1. Changes
    - Update is_restaurant_employee function to use qualified parameter names
    - Resolve ambiguity between function parameters and table column names

  2. Security
    - Maintains existing security model
    - No changes to RLS policies
*/

-- Fix the ambiguous column reference in is_restaurant_employee function
CREATE OR REPLACE FUNCTION is_restaurant_employee(p_restaurant_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = p_user_id
      AND e.restaurant_id = p_restaurant_id
      AND e.active = true
  );
END;
$$;