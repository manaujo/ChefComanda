/*
  # Correção Final das Movimentações Financeiras e Relatórios

  1. Problemas Corrigidos
    - Movimentações financeiras não sendo registradas para funcionários
    - Relatório de garçons mostrando funcionários de caixa
    - Valores incorretos nos relatórios de resumo do período

  2. Soluções Implementadas
    - Corrigir funções de finalização de pagamento para priorizar caixa do operador
    - Filtrar apenas funcionários garçons nos relatórios
    - Corrigir cálculos de vendas e métricas

  3. Segurança e Integridade
    - Manter isolamento por operador
    - Preservar integridade dos dados financeiros
    - Garantir rastreabilidade das movimentações
*/

-- Atualizar função finalizar_pagamento_mesa para garantir movimentação no caixa correto
CREATE OR REPLACE FUNCTION finalizar_pagamento_mesa(
  p_mesa_id uuid,
  p_forma_pagamento text,
  p_usuario_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comanda RECORD;
  v_mesa RECORD;
  v_caixa_id uuid;
  v_operador_nome text;
  v_operador_tipo text;
  v_valor_total decimal;
BEGIN
  -- Buscar dados da mesa
  SELECT * INTO v_mesa
  FROM mesas
  WHERE id = p_mesa_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa não encontrada';
  END IF;
  
  -- Buscar comanda aberta da mesa
  SELECT * INTO v_comanda
  FROM comandas
  WHERE mesa_id = p_mesa_id
    AND status = 'aberta'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada';
  END IF;
  
  -- Calcular valor total dos itens ativos
  SELECT COALESCE(SUM(ic.quantidade * ic.preco_unitario), 0) INTO v_valor_total
  FROM itens_comanda ic
  WHERE ic.comanda_id = v_comanda.id
    AND ic.status NOT IN ('entregue', 'cancelado');
  
  -- PRIORIDADE 1: Buscar caixa aberto do operador atual (funcionário ou usuário principal)
  SELECT co.id, co.operador_nome, co.operador_tipo 
  INTO v_caixa_id, v_operador_nome, v_operador_tipo
  FROM caixas_operadores co
  WHERE co.operador_id = p_usuario_id
    AND co.status = 'aberto'
    AND co.restaurante_id = v_mesa.restaurante_id;
  
  -- PRIORIDADE 2: Se não encontrou caixa do operador atual, buscar qualquer caixa aberto do restaurante
  IF v_caixa_id IS NULL THEN
    SELECT co.id, co.operador_nome, co.operador_tipo 
    INTO v_caixa_id, v_operador_nome, v_operador_tipo
    FROM caixas_operadores co
    WHERE co.restaurante_id = v_mesa.restaurante_id
      AND co.status = 'aberto'
    ORDER BY co.data_abertura DESC
    LIMIT 1;
  END IF;
  
  -- Marcar todos os itens como entregues
  UPDATE itens_comanda
  SET 
    status = 'entregue',
    updated_at = now()
  WHERE comanda_id = v_comanda.id
    AND status NOT IN ('entregue', 'cancelado');
  
  -- Fechar comanda
  UPDATE comandas
  SET 
    status = 'fechada',
    valor_total = v_valor_total,
    updated_at = now()
  WHERE id = v_comanda.id;
  
  -- Registrar venda
  INSERT INTO vendas (
    restaurante_id,
    mesa_id,
    comanda_id,
    valor_total,
    forma_pagamento,
    status,
    usuario_id
  ) VALUES (
    v_mesa.restaurante_id,
    p_mesa_id,
    v_comanda.id,
    v_valor_total,
    p_forma_pagamento,
    'concluida',
    p_usuario_id
  );
  
  -- Liberar mesa
  UPDATE mesas
  SET 
    status = 'livre',
    horario_abertura = NULL,
    garcom = NULL,
    valor_total = 0,
    updated_at = now()
  WHERE id = p_mesa_id;
  
  -- Registrar movimentação no caixa se houver caixa aberto
  IF v_caixa_id IS NOT NULL THEN
    INSERT INTO movimentacoes_caixa (
      caixa_operador_id,
      tipo,
      valor,
      motivo,
      observacao,
      forma_pagamento,
      usuario_id
    ) VALUES (
      v_caixa_id,
      'entrada',
      v_valor_total,
      'Mesa ' || v_mesa.numero || ' - Pagamento',
      'Operador: ' || COALESCE(v_operador_nome, 'Sistema') || ' (' || COALESCE(v_operador_tipo, 'usuario') || ') - ' || (
        SELECT COUNT(*) FROM itens_comanda WHERE comanda_id = v_comanda.id AND status != 'cancelado'
      ) || ' itens - Finalizado por: ' || COALESCE(
        (SELECT name FROM profiles WHERE id = p_usuario_id), 'Usuário'
      ),
      p_forma_pagamento,
      p_usuario_id
    );
    
    RAISE NOTICE 'Movimentação registrada no caixa % para operador % (tipo: %): % via %', 
      v_caixa_id, v_operador_nome, v_operador_tipo, v_valor_total, p_forma_pagamento;
  ELSE
    RAISE WARNING 'Nenhum caixa aberto encontrado para registrar movimentação da mesa % no restaurante %', 
      p_mesa_id, v_mesa.restaurante_id;
  END IF;
END;
$$;

-- Função para obter relatório de garçons (apenas funcionários com role 'waiter')
CREATE OR REPLACE FUNCTION get_garcons_performance_report(
  p_restaurante_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  funcionario_id uuid,
  funcionario_nome text,
  total_mesas_atendidas bigint,
  total_vendas decimal,
  quantidade_vendas bigint,
  ticket_medio decimal,
  percentual_vendas decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_vendas_geral decimal := 0;
BEGIN
  -- Calcular total geral de vendas para percentuais
  SELECT COALESCE(SUM(v.valor_total), 0) INTO total_vendas_geral
  FROM vendas v
  WHERE v.restaurante_id = p_restaurante_id
    AND v.status = 'concluida'
    AND (p_start_date IS NULL OR v.created_at >= p_start_date)
    AND (p_end_date IS NULL OR v.created_at <= p_end_date);

  RETURN QUERY
  SELECT 
    e.id as funcionario_id,
    e.name as funcionario_nome,
    COUNT(DISTINCT m.id) as total_mesas_atendidas,
    COALESCE(SUM(v.valor_total), 0) as total_vendas,
    COUNT(v.id) as quantidade_vendas,
    CASE 
      WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.valor_total), 0) / COUNT(v.id)
      ELSE 0
    END as ticket_medio,
    CASE 
      WHEN total_vendas_geral > 0 THEN (COALESCE(SUM(v.valor_total), 0) / total_vendas_geral) * 100
      ELSE 0
    END as percentual_vendas
  FROM employees e
  LEFT JOIN mesas m ON m.garcom = e.name AND m.restaurante_id = p_restaurante_id
  LEFT JOIN vendas v ON v.mesa_id = m.id 
    AND v.status = 'concluida'
    AND (p_start_date IS NULL OR v.created_at >= p_start_date)
    AND (p_end_date IS NULL OR v.created_at <= p_end_date)
  WHERE e.role = 'waiter'
    AND e.active = true
    AND e.restaurant_id = p_restaurante_id
  GROUP BY e.id, e.name
  HAVING COUNT(DISTINCT m.id) > 0 OR COUNT(v.id) > 0
  ORDER BY total_vendas DESC;
END;
$$;

-- Função para obter vendas corretas por período
CREATE OR REPLACE FUNCTION get_vendas_corretas_por_periodo(
  p_restaurante_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  data date,
  total_vendas decimal,
  quantidade_pedidos bigint,
  ticket_medio decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.created_at::date as data,
    SUM(v.valor_total) as total_vendas,
    COUNT(*) as quantidade_pedidos,
    CASE 
      WHEN COUNT(*) > 0 THEN SUM(v.valor_total) / COUNT(*)
      ELSE 0
    END as ticket_medio
  FROM vendas v
  WHERE v.restaurante_id = p_restaurante_id
    AND v.status = 'concluida'
    AND (p_start_date IS NULL OR v.created_at >= p_start_date)
    AND (p_end_date IS NULL OR v.created_at <= p_end_date)
  GROUP BY v.created_at::date
  ORDER BY data DESC;
END;
$$;

-- Função para debug de caixas por operador
CREATE OR REPLACE FUNCTION debug_caixas_por_operador_detalhado(p_restaurante_id uuid)
RETURNS TABLE(
  caixa_id uuid,
  operador_id uuid,
  operador_nome text,
  operador_tipo text,
  valor_inicial decimal,
  valor_sistema decimal,
  data_abertura timestamptz,
  total_movimentacoes bigint,
  total_entradas decimal,
  total_saidas decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id as caixa_id,
    co.operador_id,
    co.operador_nome,
    co.operador_tipo,
    co.valor_inicial,
    co.valor_sistema,
    co.data_abertura,
    COUNT(mc.id) as total_movimentacoes,
    COALESCE(SUM(CASE WHEN mc.tipo = 'entrada' THEN mc.valor ELSE 0 END), 0) as total_entradas,
    COALESCE(SUM(CASE WHEN mc.tipo = 'saida' THEN mc.valor ELSE 0 END), 0) as total_saidas
  FROM caixas_operadores co
  LEFT JOIN movimentacoes_caixa mc ON mc.caixa_operador_id = co.id
  WHERE co.restaurante_id = p_restaurante_id
    AND co.status = 'aberto'
  GROUP BY co.id, co.operador_id, co.operador_nome, co.operador_tipo, 
           co.valor_inicial, co.valor_sistema, co.data_abertura
  ORDER BY co.data_abertura DESC;
END;
$$;

-- Log para verificar se a migração foi aplicada
DO $$
BEGIN
  RAISE NOTICE 'Correção FINAL das movimentações financeiras e relatórios aplicada com sucesso';
  RAISE NOTICE 'Problemas corrigidos:';
  RAISE NOTICE '- Movimentações financeiras agora são registradas no caixa do operador correto';
  RAISE NOTICE '- Relatório de garçons agora mostra apenas funcionários com role waiter';
  RAISE NOTICE '- Valores dos relatórios corrigidos para mostrar dados reais';
  RAISE NOTICE '- Prioridade para caixa do operador atual em todas as finalizações';
END $$;