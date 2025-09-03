/*
  # Correções de Permissões para Funcionários

  1. Atualizações de Permissões
    - Funcionário Caixa: acesso a Comandas, PDV, Mesas e todos os produtos
    - Funcionário Garçom: acesso a Mesas, Comandas, Cardápio Online (QR Code)
    - Funcionário Cozinha: acesso apenas a Comandas (todas as comandas ativas)
    - Funcionário Estoque: acesso a Cardápio, Editor, Estoque, Cardápio Online, CMV

  2. Sistema de Múltiplos Caixas
    - Permitir múltiplos caixas abertos simultaneamente por diferentes operadores
    - Cada funcionário pode ter seu próprio caixa aberto
    - Administrador pode ver todos os caixas abertos

  3. Políticas RLS Atualizadas
    - Acesso completo aos dados necessários para cada função
    - Isolamento adequado por restaurante
    - Permissões granulares por funcionalidade

  4. Índices e Constraints
    - Remover constraint de caixa único por restaurante
    - Adicionar constraint de caixa único por operador
*/

-- Remover constraint que impede múltiplos caixas abertos por restaurante
DROP INDEX IF EXISTS idx_unique_open_caixa_per_restaurant;

-- Criar constraint para permitir apenas um caixa aberto por operador
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_caixa_per_operador 
ON caixas_operadores (operador_id) 
WHERE status = 'aberto';

-- Atualizar função check_employee_permissions com permissões corretas
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
      -- Garçom: Mesas, Comandas, Cardápio Online (QR Code)
      has_permission := required_permission IN ('mesas', 'comandas', 'cardapio-online');
    WHEN 'cashier' THEN
      -- Caixa: Comandas, PDV, Mesas, produtos (para ver no PDV)
      has_permission := required_permission IN ('pdv', 'comandas', 'caixa', 'mesas', 'produtos');
    WHEN 'stock' THEN
      -- Estoque: Cardápio, Editor, Estoque, Cardápio Online, CMV
      has_permission := required_permission IN ('produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv');
    WHEN 'kitchen' THEN
      -- Cozinha: apenas Comandas
      has_permission := required_permission IN ('comandas');
    WHEN 'admin' THEN
      has_permission := true; -- Admin tem acesso a tudo
    ELSE
      has_permission := false;
  END CASE;
  
  RETURN has_permission;
END;
$$;

-- Atualizar política para mesas - incluir funcionários caixa e garçom
DROP POLICY IF EXISTS "Restaurant owners and waiters can manage mesas" ON mesas;
CREATE POLICY "Restaurant owners and authorized staff can manage mesas"
  ON mesas FOR ALL
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários autorizados (garçom e caixa)
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'mesas')
    )
  );

-- Atualizar política para produtos - incluir funcionários caixa e estoque
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage produtos" ON produtos;
CREATE POLICY "Restaurant owners and authorized staff can manage produtos"
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

-- Atualizar política para comandas - incluir todos os funcionários que precisam
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage comandas" ON comandas;
CREATE POLICY "Restaurant owners and all staff can manage comandas"
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

-- Atualizar política para itens_comanda - incluir todos os funcionários que precisam
DROP POLICY IF EXISTS "Restaurant owners and authorized staff can manage itens_comanda" ON itens_comanda;
CREATE POLICY "Restaurant owners and all staff can manage itens_comanda"
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

-- Atualizar política para caixas_operadores - permitir múltiplos caixas
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
    -- Funcionário pode ver apenas seu próprio caixa
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND (
        check_employee_permissions(auth.uid(), 'caixa')
        OR operador_id = auth.uid()
      )
    )
  );

-- Atualizar política para vendas - incluir funcionários caixa
DROP POLICY IF EXISTS "Restaurant owners and cashiers can manage vendas" ON vendas;
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

-- Atualizar política para cardapio_online - incluir garçom e estoque
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage cardapio_online" ON cardapio_online;
CREATE POLICY "Restaurant owners and authorized staff can manage cardapio_online"
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

-- Política específica para funcionários de estoque editarem cardápio online
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
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage categorias" ON categorias;
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

-- Função para verificar se funcionário pode abrir caixa
CREATE OR REPLACE FUNCTION can_employee_open_cash_register(
  employee_user_id uuid,
  restaurant_id uuid
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
    AND e.restaurant_id = restaurant_id
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

-- Função para obter todos os caixas abertos de um restaurante
CREATE OR REPLACE FUNCTION get_restaurant_open_cash_registers(restaurant_id uuid)
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
  WHERE co.restaurante_id = restaurant_id
    AND co.status = 'aberto'
  ORDER BY co.data_abertura DESC;
END;
$$;

-- Atualizar política para movimentacoes_caixa - permitir acesso baseado no operador
DROP POLICY IF EXISTS "Restaurant owners can manage movimentacoes_caixa" ON movimentacoes_caixa;
CREATE POLICY "Restaurant owners and operators can manage movimentacoes_caixa"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (
    -- Proprietário pode ver todas as movimentações
    (caixa_id IS NOT NULL AND caixa_id IN (
      SELECT c.id FROM caixas c
      JOIN restaurantes r ON c.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    ))
    OR
    (caixa_operador_id IS NOT NULL AND caixa_operador_id IN (
      SELECT co.id FROM caixas_operadores co
      JOIN restaurantes r ON co.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    ))
    OR
    -- Funcionário pode ver movimentações do seu próprio caixa
    (caixa_operador_id IS NOT NULL AND caixa_operador_id IN (
      SELECT co.id FROM caixas_operadores co
      WHERE co.operador_id = auth.uid()
        AND co.restaurante_id = get_employee_restaurant(auth.uid())
    ))
  );

-- Criar índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_caixas_operadores_operador_status ON caixas_operadores(operador_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_restaurant ON employees(auth_user_id, restaurant_id) WHERE active = true;

-- Função para sincronizar dados entre funcionários do mesmo restaurante
CREATE OR REPLACE FUNCTION notify_restaurant_data_change()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
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
    ELSE
      restaurant_id := NULL;
  END CASE;

  -- Notificar mudança se restaurant_id foi encontrado
  IF restaurant_id IS NOT NULL THEN
    PERFORM pg_notify(
      'restaurant_data_change',
      json_build_object(
        'restaurant_id', restaurant_id,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de notificação nas tabelas principais
DO $$
DECLARE
  table_name text;
  notification_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 'caixas_operadores'
  ];
BEGIN
  FOREACH table_name IN ARRAY notification_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS notify_%I_data_change_trigger ON %I;
      CREATE TRIGGER notify_%I_data_change_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION notify_restaurant_data_change();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;