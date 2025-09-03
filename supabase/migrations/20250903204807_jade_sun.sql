/*
  # Update Plan Name Mapping Function

  1. Changes
    - Update get_plan_name_from_price_id function with new price IDs
    - Map correct price IDs to plan names
    - Remove old price IDs that are no longer used

  2. Products
    - Básico: price_1RMZAmB4if3rE1yX5xRa4ZnU
    - Starter Anual: price_1RMZ8oB4if3rE1yXA0fqPRvf
    - Básico Anual: price_1RMZ7bB4if3rE1yXb6F4Jj0u
*/

-- Update the plan name mapping function with new price IDs
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    WHEN 'price_1RMZAmB4if3rE1yX5xRa4ZnU' THEN 'Básico'
    WHEN 'price_1RMZ8oB4if3rE1yXA0fqPRvf' THEN 'Starter Anual'
    WHEN 'price_1RMZ7bB4if3rE1yXb6F4Jj0u' THEN 'Básico Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Log successful update
DO $$
BEGIN
  RAISE NOTICE 'Plan name mapping function updated with new price IDs';
  RAISE NOTICE 'Supported plans: Básico, Starter Anual, Básico Anual';
END $$;