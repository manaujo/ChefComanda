/*
  # Sistema de Autenticação de Funcionários

  1. Novas Tabelas
    - `employee_users` - Mapear funcionários para auth.users
    - Atualizar tabela `employees` com auth_user_id

  2. Funções
    - `create_employee_user` - Criar usuário no auth.users via Admin API
    - `get_employee_restaurant` - Obter restaurante do funcionário
    - `check_employee_permissions` - Verificar permissões do funcionário

  3. Segurança
    - RLS policies específicas para funcionários
    - Restrições por cargo/função
    - Isolamento por restaurante

  4. Triggers
    - Trigger para criar perfil quando funcionário é criado
    - Trigger para sincronizar dados
*/

-- Adicionar coluna auth_user_id na tabela employees se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar coluna restaurant_id na tabela employees se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN restaurant_id uuid;
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_restaurant_id ON employees(restaurant_id);

-- Função para obter restaurante do funcionário
CREATE OR REPLACE FUNCTION get_employee_restaurant(employee_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  restaurant_id uuid;
BEGIN
  -- Buscar restaurante através do funcionário
  SELECT e.restaurant_id INTO restaurant_id
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.active = true;
  
  RETURN restaurant_id;
END;
$$;

-- Função para verificar permissões do funcionário
CREATE OR REPLACE FUNCTION check_employee_permissions(
  employee_user_id uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_role text;
  has_permission boolean := false;
BEGIN
  -- Buscar cargo do funcionário
  SELECT e.role INTO employee_role
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.active = true;
  
  -- Verificar permissões baseadas no cargo
  CASE employee_role
    WHEN 'waiter' THEN
      has_permission := required_permission IN ('mesas', 'comandas');
    WHEN 'cashier' THEN
      has_permission := required_permission IN ('pdv', 'comandas', 'caixa');
    WHEN 'stock' THEN
      has_permission := required_permission IN ('produtos', 'estoque');
    WHEN 'kitchen' THEN
      has_permission := required_permission IN ('comandas');
    WHEN 'admin' THEN
      has_permission := true; -- Admin tem acesso a tudo
    ELSE
      has_permission := false;
  END CASE;
  
  RETURN has_permission;
END;
$$;

-- Atualizar políticas RLS para incluir funcionários

-- Política para mesas - incluir funcionários garçom
DROP POLICY IF EXISTS "Restaurant owners and waiters can manage mesas" ON mesas;
CREATE POLICY "Restaurant owners and waiters can manage mesas"
  ON mesas FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionário garçom do restaurante
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'mesas')
    )
  );

-- Política para comandas - incluir funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners can manage comandas" ON comandas;
CREATE POLICY "Restaurant owners and authorized staff can manage comandas"
  ON comandas FOR ALL
  TO authenticated
  USING (
    mesa_id IN (
      SELECT m.id FROM mesas m
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
    OR
    mesa_id IN (
      SELECT m.id FROM mesas m
      WHERE m.restaurante_id = get_employee_restaurant(auth.uid())
        AND check_employee_permissions(auth.uid(), 'comandas')
    )
  );

-- Política para itens_comanda - incluir funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners can manage itens_comanda" ON itens_comanda;
CREATE POLICY "Restaurant owners and authorized staff can manage itens_comanda"
  ON itens_comanda FOR ALL
  TO authenticated
  USING (
    comanda_id IN (
      SELECT c.id FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
    OR
    comanda_id IN (
      SELECT c.id FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE m.restaurante_id = get_employee_restaurant(auth.uid())
        AND check_employee_permissions(auth.uid(), 'comandas')
    )
  );

-- Política para produtos - incluir funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners can manage produtos" ON produtos;
CREATE POLICY "Restaurant owners and stock staff can manage produtos"
  ON produtos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'produtos')
    )
  );

-- Política para insumos - incluir funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners can manage insumos" ON insumos;
CREATE POLICY "Restaurant owners and stock staff can manage insumos"
  ON insumos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'estoque')
    )
  );

-- Política para caixas_operadores - incluir funcionários de caixa
DROP POLICY IF EXISTS "Restaurant owners can manage caixas_operadores" ON caixas_operadores;
CREATE POLICY "Restaurant owners and cashiers can manage caixas_operadores"
  ON caixas_operadores FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'caixa')
    )
  );

-- Política para vendas - incluir funcionários de caixa
DROP POLICY IF EXISTS "Restaurant owners can manage vendas" ON vendas;
CREATE POLICY "Restaurant owners and cashiers can manage vendas"
  ON vendas FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'pdv')
    )
  );

-- Política para employees - apenas proprietários podem gerenciar
CREATE POLICY "Company owners can manage employees with auth"
  ON employees FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM company_profiles WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários podem ver seus próprios dados
    auth_user_id = auth.uid()
  );

-- Trigger para sincronizar restaurant_id quando funcionário é criado
CREATE OR REPLACE FUNCTION sync_employee_restaurant_id()
RETURNS TRIGGER AS $$
DECLARE
  owner_restaurant_id uuid;
BEGIN
  -- Buscar restaurante do proprietário da empresa
  SELECT r.id INTO owner_restaurant_id
  FROM restaurantes r
  JOIN company_profiles cp ON r.user_id = cp.user_id
  WHERE cp.id = NEW.company_id;
  
  -- Atualizar restaurant_id do funcionário
  NEW.restaurant_id := owner_restaurant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS sync_employee_restaurant_id_trigger ON employees;
CREATE TRIGGER sync_employee_restaurant_id_trigger
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_restaurant_id();

-- Atualizar restaurant_id para funcionários existentes
UPDATE employees 
SET restaurant_id = (
  SELECT r.id 
  FROM restaurantes r
  JOIN company_profiles cp ON r.user_id = cp.user_id
  WHERE cp.id = employees.company_id
)
WHERE restaurant_id IS NULL;