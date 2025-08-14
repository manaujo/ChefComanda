/*
  # Adicionar Função Cozinha e Acesso Compartilhado aos Dados

  1. Modificações na Tabela Employees
    - Atualizar constraint para incluir 'kitchen' como role válido
    - Garantir que funcionários tenham acesso aos dados do restaurante

  2. Funções Atualizadas
    - Atualizar função check_employee_permissions para incluir kitchen
    - Atualizar função get_employee_restaurant para melhor performance

  3. Políticas RLS Atualizadas
    - Garantir que funcionários tenham acesso aos dados compartilhados
    - Manter isolamento por restaurante
    - Permitir acesso completo aos dados do restaurante principal

  4. Novos Índices
    - Melhorar performance das consultas de funcionários
*/

-- Atualizar constraint da tabela employees para incluir kitchen
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_role_check' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees DROP CONSTRAINT employees_role_check;
  END IF;
  
  -- Adicionar nova constraint com kitchen incluído
  ALTER TABLE employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('admin', 'kitchen', 'waiter', 'cashier', 'stock'));
END $$;

-- Atualizar função check_employee_permissions para incluir kitchen
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
      has_permission := required_permission IN ('pdv', 'comandas', 'caixa', 'ifood');
    WHEN 'stock' THEN
      has_permission := required_permission IN ('produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor');
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

-- Atualizar políticas RLS para cardapio_online - incluir funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners can manage cardapio_online" ON cardapio_online;
CREATE POLICY "Restaurant owners and stock staff can manage cardapio_online"
  ON cardapio_online FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'cardapio-online')
    )
  );

-- Política para funcionários de estoque editarem cardápio online
CREATE POLICY "Stock staff can edit cardapio_online"
  ON cardapio_online FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'cardapio-online-editor')
    )
  );

-- Atualizar política para categorias - incluir funcionários de estoque
DROP POLICY IF EXISTS "Restaurant owners can manage categorias" ON categorias;
CREATE POLICY "Restaurant owners and stock staff can manage categorias"
  ON categorias FOR ALL
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

-- Garantir que funcionários vejam dados em tempo real do restaurante principal
-- Atualizar política para restaurantes - funcionários podem ver dados do restaurante
DROP POLICY IF EXISTS "Users can manage own restaurant" ON restaurantes;
CREATE POLICY "Users can manage own restaurant"
  ON restaurantes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    id = get_employee_restaurant(auth.uid())
  );

CREATE POLICY "Restaurant owners can update restaurant"
  ON restaurantes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can insert restaurant"
  ON restaurantes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can delete restaurant"
  ON restaurantes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar função para verificar se usuário é funcionário do restaurante
CREATE OR REPLACE FUNCTION is_restaurant_employee(restaurant_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = user_id
      AND e.restaurant_id = restaurant_id
      AND e.active = true
  );
END;
$$;

-- Atualizar política para movimentacoes_caixa para incluir funcionários de caixa
DROP POLICY IF EXISTS "Restaurant owners and cashiers can manage movimentacoes_caixa" ON movimentacoes_caixa;
CREATE POLICY "Restaurant owners and cashiers can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    -- Allow access if using old caixa_id system
    (caixa_id IS NOT NULL AND caixa_id IN (
      SELECT c.id FROM caixas c
      JOIN restaurantes r ON c.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    ))
    OR
    -- Allow access if using new caixa_operador_id system
    (caixa_operador_id IS NOT NULL AND caixa_operador_id IN (
      SELECT co.id FROM caixas_operadores co
      JOIN restaurantes r ON co.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
        OR is_restaurant_employee(r.id, auth.uid())
    ))
  );

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_restaurant_role ON employees(restaurant_id, role) WHERE active = true;

-- Função para sincronizar dados em tempo real entre funcionários
CREATE OR REPLACE FUNCTION sync_employee_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar mudanças para todos os funcionários do restaurante
  PERFORM pg_notify(
    'restaurant_data_change',
    json_build_object(
      'restaurant_id', COALESCE(NEW.restaurant_id, OLD.restaurant_id),
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de sincronização nas tabelas principais
DO $$
DECLARE
  table_name text;
  sync_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 
    'insumos', 'cardapio_online', 'categorias'
  ];
BEGIN
  FOREACH table_name IN ARRAY sync_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS sync_%I_data_trigger ON %I;
      CREATE TRIGGER sync_%I_data_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION sync_employee_data();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- Atualizar restaurant_id para funcionários existentes que não têm
UPDATE employees 
SET restaurant_id = (
  SELECT r.id 
  FROM restaurantes r
  JOIN company_profiles cp ON r.user_id = cp.user_id
  WHERE cp.id = employees.company_id
)
WHERE restaurant_id IS NULL AND company_id IS NOT NULL;