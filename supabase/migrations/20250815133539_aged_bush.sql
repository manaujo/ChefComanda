/*
  # Fix Ambiguous Column Reference in PDV Functions

  1. Function Updates
    - Fix ambiguous `restaurant_id` column reference in `can_employee_open_cash_register`
    - Rename parameter to `p_restaurant_id` to avoid conflicts
    - Update all internal references to use the prefixed parameter name

  2. Additional Function Fixes
    - Apply same fix to `get_restaurant_open_cash_registers` function
    - Ensure all parameter names are properly prefixed to avoid ambiguity
*/

-- Fix ambiguous column reference in can_employee_open_cash_register function
CREATE OR REPLACE FUNCTION can_employee_open_cash_register(
  employee_user_id uuid,
  p_restaurant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_role text;
  has_open_cash boolean := false;
BEGIN
  -- Verificar se é funcionário de caixa
  SELECT e.role INTO employee_role
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.restaurant_id = p_restaurant_id
    AND e.active = true;
  
  -- Apenas funcionários de caixa podem abrir caixa
  IF employee_role != 'cashier' THEN
    RETURN false;
  END IF;
  
  -- Verificar se já tem caixa aberto
  SELECT EXISTS(
    SELECT 1 FROM caixas_operadores
    WHERE operador_id = employee_user_id
      AND status = 'aberto'
  ) INTO has_open_cash;
  
  -- Não pode abrir se já tem um caixa aberto
  RETURN NOT has_open_cash;
END;
$$;

-- Fix ambiguous column reference in get_restaurant_open_cash_registers function
CREATE OR REPLACE FUNCTION get_restaurant_open_cash_registers(p_restaurant_id uuid)
RETURNS TABLE(
  id uuid,
  operador_id uuid,
  operador_nome text,
  operador_tipo text,
  valor_inicial decimal,
  valor_sistema decimal,
  data_abertura timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id,
    co.operador_id,
    co.operador_nome,
    co.operador_tipo,
    co.valor_inicial,
    co.valor_sistema,
    co.data_abertura
  FROM caixas_operadores co
  WHERE co.restaurante_id = p_restaurant_id
    AND co.status = 'aberto'
  ORDER BY co.data_abertura DESC;
END;
$$;