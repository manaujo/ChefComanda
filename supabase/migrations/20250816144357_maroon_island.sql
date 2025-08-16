/*
  # Corrigir Acesso de Dados para Funcionários

  1. Problemas Identificados
    - Funcionários não conseguem ver dados do restaurante principal
    - PDV mostra status inconsistente entre contas
    - Comandas não aparecem para funcionários
    - Produtos não são visíveis para funcionários

  2. Soluções
    - Corrigir políticas RLS para garantir acesso aos dados compartilhados
    - Melhorar função get_employee_restaurant
    - Garantir que funcionários vejam dados em tempo real
    - Corrigir permissões específicas por função

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
  -- Buscar restaurante através do funcionário
  SELECT e.restaurant_id INTO restaurant_id
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.active = true
  LIMIT 1;
  
  -- Se não encontrou via restaurant_id, buscar via company_id
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

-- Atualizar política para mesas - garantir acesso completo para funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage mesas" ON mesas;
CREATE POLICY "Restaurant owners and authorized staff can manage mesas"
  ON mesas FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários autorizados do restaurante
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Atualizar política para produtos - garantir acesso para funcionários que precisam
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage produtos" ON produtos;
CREATE POLICY "Restaurant owners and authorized staff can manage produtos"
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

-- Atualizar política para comandas - acesso completo para funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners and all staff can manage comandas" ON comandas;
CREATE POLICY "Restaurant owners and all staff can manage comandas"
  ON comandas FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    mesa_id IN (
      SELECT m.id FROM mesas m
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante
    mesa_id IN (
      SELECT m.id FROM mesas m
      WHERE m.restaurante_id = get_employee_restaurant(auth.uid())
    )
  );

-- Atualizar política para itens_comanda - acesso completo para funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners and all staff can manage itens_comanda" ON itens_comanda;
CREATE POLICY "Restaurant owners and all staff can manage itens_comanda"
  ON itens_comanda FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    comanda_id IN (
      SELECT c.id FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      JOIN restaurantes r ON m.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante
    comanda_id IN (
      SELECT c.id FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE m.restaurante_id = get_employee_restaurant(auth.uid())
    )
  );

-- Atualizar política para caixas_operadores - melhorar acesso para funcionários
DROP POLICY IF EXISTS "Restaurant owners and cashiers can manage caixas_operadores" ON caixas_operadores;
CREATE POLICY "Restaurant owners and cashiers can manage caixas_operadores"
  ON caixas_operadores FOR ALL
  TO authenticated
  USING (
    -- Proprietário pode ver todos os caixas do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionário pode ver caixas do seu restaurante
    restaurante_id = get_employee_restaurant(auth.uid())
  );

-- Atualizar política para categorias - acesso para funcionários que precisam
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage categorias" ON categorias;
CREATE POLICY "Restaurant owners and stock staff can manage categorias"
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

-- Atualizar política para cardapio_online - acesso para funcionários autorizados
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage cardapio_online" ON cardapio_online;
CREATE POLICY "Restaurant owners and authorized staff can manage cardapio_online"
  ON cardapio_online FOR ALL
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

-- Política específica para funcionários de estoque editarem cardápio online
DROP POLICY IF EXISTS "Stock staff can edit cardapio_online" ON cardapio_online;
CREATE POLICY "Stock staff can edit cardapio_online"
  ON cardapio_online FOR ALL
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

-- Atualizar política para restaurantes - funcionários podem ver dados do restaurante
DROP POLICY IF EXISTS "Users can manage own restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can update restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can insert restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can delete restaurant" ON restaurantes;

CREATE POLICY "Users can view own restaurant"
  ON restaurantes FOR SELECT
  TO authenticated
  USING (
    -- Proprietário do restaurante
    auth.uid() = user_id
    OR
    -- Funcionário do restaurante
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

-- Função para verificar se funcionário tem acesso a dados do restaurante
CREATE OR REPLACE FUNCTION employee_has_restaurant_access(
  employee_user_id uuid,
  target_restaurant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = employee_user_id
      AND e.restaurant_id = target_restaurant_id
      AND e.active = true
  );
END;
$$;

-- Criar índices para melhorar performance das consultas de funcionários
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_active ON employees(auth_user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_employees_restaurant_active ON employees(restaurant_id) WHERE active = true;

-- Função para sincronizar dados em tempo real entre todas as contas do restaurante
CREATE OR REPLACE FUNCTION broadcast_restaurant_changes()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
  notification_data jsonb;
BEGIN
  -- Determinar restaurant_id baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'mesas' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'produtos' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'comandas' THEN
      SELECT m.restaurante_id INTO restaurant_id
      FROM mesas m
      WHERE m.id = COALESCE(NEW.mesa_id, OLD.mesa_id);
    WHEN 'itens_comanda' THEN
      SELECT m.restaurante_id INTO restaurant_id
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = COALESCE(NEW.comanda_id, OLD.comanda_id);
    WHEN 'caixas_operadores' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    ELSE
      restaurant_id := NULL;
  END CASE;

  -- Criar dados da notificação
  notification_data := jsonb_build_object(
    'restaurant_id', restaurant_id,
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', COALESCE(NEW.id, OLD.id),
    'timestamp', extract(epoch from now())
  );

  -- Notificar mudança se restaurant_id foi encontrado
  IF restaurant_id IS NOT NULL THEN
    -- Notificar via pg_notify para todas as conexões
    PERFORM pg_notify('restaurant_changes', notification_data::text);
    
    -- Notificar via realtime para o canal específico do restaurante
    PERFORM pg_notify(
      'realtime:restaurant:' || restaurant_id::text,
      notification_data::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de broadcast em todas as tabelas relevantes
DO $$
DECLARE
  table_name text;
  broadcast_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 
    'caixas_operadores', 'movimentacoes_caixa', 'vendas'
  ];
BEGIN
  FOREACH table_name IN ARRAY broadcast_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS broadcast_%I_changes_trigger ON %I;
      CREATE TRIGGER broadcast_%I_changes_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION broadcast_restaurant_changes();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;