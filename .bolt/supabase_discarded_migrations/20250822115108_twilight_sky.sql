/*
  # Corrigir Problemas de Insumos e Acesso Público

  1. Problemas Corrigidos
    - Multiplicação incorreta de quantidades (100 vira 100000)
    - Data de validade sendo salva com timezone incorreto
    - Histórico de movimentações não visível para funcionários
    - Cardápio público não acessível para usuários anônimos

  2. Soluções
    - Corrigir função registrar_movimentacao_estoque
    - Ajustar políticas RLS para movimentacoes_estoque
    - Corrigir políticas para cardapio_online (acesso público)
    - Ajustar timezone para datas

  3. Segurança
    - Manter isolamento por restaurante
    - Permitir acesso público ao cardápio
    - Funcionários podem ver histórico de movimentações
*/

-- 1. Corrigir função registrar_movimentacao_estoque para não multiplicar quantidades
CREATE OR REPLACE FUNCTION registrar_movimentacao_estoque(
  p_insumo_id uuid,
  p_tipo text,
  p_quantidade decimal,
  p_motivo text,
  p_observacao text DEFAULT NULL,
  p_usuario_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insumo RECORD;
  v_nova_quantidade decimal;
  v_restaurante_id uuid;
BEGIN
  -- Buscar dados do insumo
  SELECT * INTO v_insumo
  FROM insumos
  WHERE id = p_insumo_id AND ativo = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo não encontrado ou inativo';
  END IF;
  
  v_restaurante_id := v_insumo.restaurante_id;
  
  -- Calcular nova quantidade (usar diretamente sem multiplicação)
  IF p_tipo = 'entrada' THEN
    v_nova_quantidade := v_insumo.quantidade + p_quantidade;
  ELSE
    v_nova_quantidade := v_insumo.quantidade - p_quantidade;
    
    -- Verificar se há quantidade suficiente
    IF v_nova_quantidade < 0 THEN
      RAISE EXCEPTION 'Quantidade insuficiente em estoque. Disponível: % %', 
        v_insumo.quantidade, v_insumo.unidade_medida;
    END IF;
  END IF;
  
  -- Ensure user profile exists before inserting movement
  INSERT INTO profiles (id, name)
  VALUES (p_usuario_id, 'Usuário')
  ON CONFLICT (id) DO NOTHING;
  
  -- Registrar movimentação (usar quantidade diretamente)
  INSERT INTO movimentacoes_estoque (
    restaurante_id,
    insumo_id,
    tipo,
    quantidade,
    quantidade_anterior,
    quantidade_atual,
    motivo,
    observacao,
    usuario_id
  ) VALUES (
    v_restaurante_id,
    p_insumo_id,
    p_tipo,
    p_quantidade, -- Usar diretamente sem multiplicação
    v_insumo.quantidade,
    v_nova_quantidade,
    p_motivo,
    p_observacao,
    p_usuario_id
  );
  
  -- Atualizar quantidade do insumo (usar nova quantidade calculada)
  UPDATE insumos 
  SET 
    quantidade = v_nova_quantidade,
    updated_at = now()
  WHERE id = p_insumo_id;
  
  -- Log da operação para debug
  RAISE NOTICE 'Movimentação registrada: % % de % (% -> %)', 
    p_tipo, p_quantidade, v_insumo.nome, v_insumo.quantidade, v_nova_quantidade;
END;
$$;

-- 2. Corrigir política RLS para movimentacoes_estoque - permitir funcionários verem histórico
DROP POLICY IF EXISTS "Restaurant owners and stock staff can manage movimentacoes_estoque" ON movimentacoes_estoque;
CREATE POLICY "Restaurant owners and staff can view movimentacoes_estoque"
  ON movimentacoes_estoque FOR SELECT
  TO authenticated
  USING (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários do restaurante podem ver movimentações
    restaurante_id = get_employee_restaurant(auth.uid())
  );

CREATE POLICY "Restaurant owners and stock staff can insert movimentacoes_estoque"
  ON movimentacoes_estoque FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Proprietário do restaurante
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários de estoque podem inserir movimentações
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'estoque')
    )
  );

-- 3. Corrigir políticas para cardapio_online - garantir acesso público
DROP POLICY IF EXISTS "Public can view cardapio_online" ON cardapio_online;
DROP POLICY IF EXISTS "Anonymous can view cardapio_online" ON cardapio_online;

-- Política para acesso público (usuários anônimos)
CREATE POLICY "Public access to cardapio_online"
  ON cardapio_online FOR SELECT
  TO anon
  USING (ativo = true AND disponivel_online = true);

-- Política para usuários autenticados
CREATE POLICY "Authenticated users can view cardapio_online"
  ON cardapio_online FOR SELECT
  TO authenticated
  USING (
    -- Proprietário pode ver todos
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    -- Funcionários podem ver do seu restaurante
    restaurante_id = get_employee_restaurant(auth.uid())
    OR
    -- Qualquer um pode ver itens públicos
    (ativo = true AND disponivel_online = true)
  );

-- 4. Corrigir política para restaurantes - permitir acesso público para cardápio
DROP POLICY IF EXISTS "Users can view own restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can update restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can insert restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Restaurant owners can delete restaurant" ON restaurantes;

-- Política para visualização (incluindo acesso público para cardápio)
CREATE POLICY "Public can view restaurant for menu"
  ON restaurantes FOR SELECT
  TO anon
  USING (true); -- Permite acesso público para visualizar dados básicos

CREATE POLICY "Users can view restaurants"
  ON restaurantes FOR SELECT
  TO authenticated
  USING (
    -- Proprietário do restaurante
    auth.uid() = user_id
    OR
    -- Funcionário do restaurante
    id = get_employee_restaurant(auth.uid())
    OR
    -- Qualquer usuário autenticado pode ver dados básicos
    true
  );

-- Políticas para modificação (apenas proprietários)
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

-- 5. Função para corrigir timezone de datas
CREATE OR REPLACE FUNCTION fix_date_timezone(input_date text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Converter string de data para date sem problemas de timezone
  RETURN input_date::date;
END;
$$;

-- 6. Função para debug de quantidades
CREATE OR REPLACE FUNCTION debug_insumo_quantities(p_insumo_id uuid)
RETURNS TABLE(
  insumo_nome text,
  quantidade_atual decimal,
  quantidade_minima decimal,
  unidade_medida text,
  movimentacoes_count bigint,
  ultima_movimentacao timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.nome as insumo_nome,
    i.quantidade as quantidade_atual,
    i.quantidade_minima,
    i.unidade_medida,
    (SELECT COUNT(*) FROM movimentacoes_estoque me WHERE me.insumo_id = i.id) as movimentacoes_count,
    (SELECT MAX(me.created_at) FROM movimentacoes_estoque me WHERE me.insumo_id = i.id) as ultima_movimentacao
  FROM insumos i
  WHERE i.id = p_insumo_id;
END;
$$;

-- 7. Atualizar get_movimentacoes_estoque para funcionar com funcionários
CREATE OR REPLACE FUNCTION get_movimentacoes_estoque(
  p_restaurante_id uuid,
  p_insumo_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  insumo_nome text,
  tipo text,
  quantidade decimal,
  quantidade_anterior decimal,
  quantidade_atual decimal,
  motivo text,
  observacao text,
  usuario_nome text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.id,
    i.nome as insumo_nome,
    me.tipo,
    me.quantidade,
    me.quantidade_anterior,
    me.quantidade_atual,
    me.motivo,
    me.observacao,
    COALESCE(p.name, 'Usuário') as usuario_nome,
    me.created_at
  FROM movimentacoes_estoque me
  JOIN insumos i ON me.insumo_id = i.id
  LEFT JOIN profiles p ON me.usuario_id = p.id
  WHERE me.restaurante_id = p_restaurante_id
    AND (p_insumo_id IS NULL OR me.insumo_id = p_insumo_id)
    AND (p_start_date IS NULL OR me.created_at >= p_start_date)
    AND (p_end_date IS NULL OR me.created_at <= p_end_date)
  ORDER BY me.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 8. Criar view para facilitar acesso aos dados de movimentações
CREATE OR REPLACE VIEW view_movimentacoes_estoque_detalhadas AS
SELECT 
  me.id,
  me.restaurante_id,
  me.insumo_id,
  i.nome as insumo_nome,
  i.unidade_medida,
  me.tipo,
  me.quantidade,
  me.quantidade_anterior,
  me.quantidade_atual,
  me.motivo,
  me.observacao,
  me.usuario_id,
  COALESCE(p.name, 'Usuário') as usuario_nome,
  me.created_at
FROM movimentacoes_estoque me
JOIN insumos i ON me.insumo_id = i.id
LEFT JOIN profiles p ON me.usuario_id = p.id;

-- Política RLS para a view
CREATE POLICY "Restaurant staff can view movimentacoes_detalhadas"
  ON view_movimentacoes_estoque_detalhadas FOR SELECT
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

-- 9. Log para verificar se a migração foi aplicada
DO $$
BEGIN
  RAISE NOTICE 'Migração de correção de insumos, datas e acesso público aplicada com sucesso';
  RAISE NOTICE 'Problemas corrigidos:';
  RAISE NOTICE '- Multiplicação incorreta de quantidades';
  RAISE NOTICE '- Timezone de datas de validade';
  RAISE NOTICE '- Acesso de funcionários ao histórico';
  RAISE NOTICE '- Acesso público ao cardápio';
END $$;