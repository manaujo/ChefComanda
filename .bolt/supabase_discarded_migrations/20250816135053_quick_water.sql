/*
  # Fix Ambiguous Column Reference

  1. Changes
    - Update `get_employee_restaurant` function to use prefixed parameter and variable names
    - Rename `employee_user_id` parameter to `p_employee_user_id`
    - Rename `restaurant_id` variable to `v_restaurant_id`
    - This resolves the ambiguous column reference error in RLS policies

  2. Security
    - Maintains existing RLS policies functionality
    - No changes to security model
*/

-- Função para obter restaurante do funcionário (versão corrigida)
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