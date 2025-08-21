/*
  # Corrigir Acesso de Funcionários de Estoque aos Produtos e Insumos

  1. Problema Identificado
    - Funcionários de estoque não conseguem ver produtos cadastrados
    - Funcionários de estoque não conseguem ver insumos cadastrados
    - Políticas RLS muito restritivas para funcionários

  2. Soluções
    - Corrigir políticas RLS para produtos
    - Corrigir políticas RLS para insumos
    - Garantir que funcionários vejam dados do restaurante principal
    - Melhorar função get_employee_restaurant

  3. Segurança
    - Manter isolamento por restaurante
    - Garantir que funcionários só vejam dados do seu restaurante
    - Preservar controle de acesso por função
*/

-- Corrigir função get_employee_restaurant para ser mais robusta
CREATE OR REPLACE FUNCTION get_employee_restaurant(employee_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  restaurant_id uuid;
BEGIN
  -- Buscar restaurante através do funcionário (método 1: restaurant_id direto)
  SELECT e.restaurant_id INTO restaurant_id
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.active = true
  LIMIT 1;
  
  -- Se não encontrou via restaurant_id, buscar via company_id (método 2)
  IF restaurant_id IS NULL THEN
    SELECT r.id INTO restaurant_id
    FROM employees e
    JOIN company_profiles cp ON e.company_id = cp.id
    JOIN restaurantes r ON cp.user_id = r.user_id
    WHERE e.auth_user_id = employee_user_id
      AND e.active = true
    LIMIT 1;
  END IF;
  
  RETURN restaurant_id;
END;
$$;

-- Atualizar política para produtos - garantir acesso completo para funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage produtos" ON produtos;
CREATE POLICY "Restaurant owners and staff can manage produtos"
  ON produtos FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante (todos podem ver produtos)
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Atualizar política para insumos - garantir acesso completo para funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage insumos" ON insumos;
CREATE POLICY "Restaurant owners and staff can manage insumos"
  ON insumos FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante (especialmente estoque)
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Atualizar política para categorias - garantir acesso para funcionários
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage categorias" ON categorias;
CREATE POLICY "Restaurant owners and staff can manage categorias"
  ON categorias FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Atualizar política para movimentacoes_estoque - garantir acesso para funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage movimentacoes_estoque" ON movimentacoes_estoque;
CREATE POLICY "Restaurant owners and stock staff can manage movimentacoes_estoque"
  ON movimentacoes_estoque FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários de estoque do restaurante
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Função para debug - verificar dados do funcionário
CREATE OR REPLACE FUNCTION debug_employee_data(employee_user_id uuid)
RETURNS TABLE(
  employee_id uuid,
  employee_name text,
  employee_role text,
  employee_active boolean,
  company_id uuid,
  restaurant_id uuid,
  restaurant_name text,
  auth_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.role as employee_role,
    e.active as employee_active,
    e.company_id,
    e.restaurant_id,
    r.nome as restaurant_name,
    e.auth_user_id
  FROM employees e
  LEFT JOIN restaurantes r ON e.restaurant_id = r.id
  WHERE e.auth_user_id = employee_user_id;
END;
$$;

-- Função para debug - verificar produtos visíveis para funcionário
CREATE OR REPLACE FUNCTION debug_employee_produtos_access(employee_user_id uuid)
RETURNS TABLE(
  produto_id uuid,
  produto_nome text,
  restaurante_id uuid,
  employee_restaurant_id uuid,
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_restaurant_id uuid;
BEGIN
  -- Obter restaurant_id do funcionário
  emp_restaurant_id := get_employee_restaurant(employee_user_id);
  
  RETURN QUERY
  SELECT 
    p.id as produto_id,
    p.nome as produto_nome,
    p.restaurante_id,
    emp_restaurant_id as employee_restaurant_id,
    (p.restaurante_id = emp_restaurant_id) as has_access
  FROM produtos p
  WHERE p.restaurante_id = emp_restaurant_id;
END;
$$;

-- Função para debug - verificar insumos visíveis para funcionário
CREATE OR REPLACE FUNCTION debug_employee_insumos_access(employee_user_id uuid)
RETURNS TABLE(
  insumo_id uuid,
  insumo_nome text,
  restaurante_id uuid,
  employee_restaurant_id uuid,
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_restaurant_id uuid;
BEGIN
  -- Obter restaurant_id do funcionário
  emp_restaurant_id := get_employee_restaurant(employee_user_id);
  
  RETURN QUERY
  SELECT 
    i.id as insumo_id,
    i.nome as insumo_nome,
    i.restaurante_id,
    emp_restaurant_id as employee_restaurant_id,
    (i.restaurante_id = emp_restaurant_id) as has_access
  FROM insumos i
  WHERE i.restaurante_id = emp_restaurant_id;
END;
$$;

-- Atualizar restaurant_id para funcionários que não têm (correção de dados)
UPDATE employees 
SET restaurant_id = (
  SELECT r.id 
  FROM restaurantes r
  JOIN company_profiles cp ON r.user_id = cp.user_id
  WHERE cp.id = employees.company_id
)
WHERE restaurant_id IS NULL 
  AND company_id IS NOT NULL
  AND active = true;

-- Criar índices para melhorar performance das consultas de funcionários
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_restaurant_active 
ON employees(auth_user_id, restaurant_id) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_produtos_restaurante_disponivel 
ON produtos(restaurante_id, disponivel);

CREATE INDEX IF NOT EXISTS idx_insumos_restaurante_ativo 
ON insumos(restaurante_id, ativo);

-- Log para verificar se a migração foi aplicada
DO $$
BEGIN
  RAISE NOTICE 'Migração de correção de acesso para funcionários de estoque aplicada com sucesso';
END $$;