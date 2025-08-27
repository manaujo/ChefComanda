/*
  # Corrigir Movimentações Financeiras para Funcionários de Caixa - Versão Final

  1. Problema Identificado
    - Funcionários de caixa não recebem movimentações financeiras ao finalizar pagamentos
    - Apenas a conta principal está recebendo as movimentações
    - Funções de finalização não estão buscando o caixa do operador atual corretamente

  2. Soluções Implementadas
    - Atualizar função finalizar_pagamento_pedido para priorizar caixa do operador atual
    - Atualizar função finalizar_pagamento_mesa para priorizar caixa do operador atual
    - Melhorar busca de caixa aberto por operador específico
    - Adicionar logs detalhados para rastreabilidade

  3. Segurança e Integridade
    - Manter isolamento por operador
    - Preservar integridade dos dados financeiros
    - Garantir rastreabilidade completa das movimentações
    - Fallback para qualquer caixa aberto se operador não tiver caixa próprio
*/

-- Atualizar função finalizar_pagamento_pedido com prioridade para caixa do operador
CREATE OR REPLACE FUNCTION finalizar_pagamento_pedido(
  p_pedido_id uuid,
  p_forma_pagamento text,
  p_usuario_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido RECORD;
  v_caixa_id uuid;
  v_operador_nome text;
  v_operador_tipo text;
BEGIN
  -- Buscar dados do pedido
  SELECT * INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  -- PRIORIDADE 1: Buscar caixa aberto do operador atual (funcionário ou usuário principal)
  SELECT co.id, co.operador_nome, co.operador_tipo 
  INTO v_caixa_id, v_operador_nome, v_operador_tipo
  FROM caixas_operadores co
  WHERE co.operador_id = p_usuario_id
    AND co.status = 'aberto'
    AND co.restaurante_id = v_pedido.restaurante_id;
  
  -- PRIORIDADE 2: Se não encontrou caixa do operador atual, buscar qualquer caixa aberto do restaurante
  IF v_caixa_id IS NULL THEN
    SELECT co.id, co.operador_nome, co.operador_tipo 
    INTO v_caixa_id, v_operador_nome, v_operador_tipo
    FROM caixas_operadores co
    WHERE co.restaurante_id = v_pedido.restaurante_id
      AND co.status = 'aberto'
    ORDER BY co.data_abertura DESC
    LIMIT 1;
  END IF;
  
  -- Marcar todos os itens como entregues
  UPDATE itens_pedido
  SET 
    status = 'entregue',
    updated_at = now()
  WHERE pedido_id = p_pedido_id
    AND status != 'cancelado';
  
  -- Atualizar status do pedido para pago
  UPDATE pedidos
  SET 
    status = 'pago',
    updated_at = now()
  WHERE id = p_pedido_id;
  
  -- Registrar venda
  INSERT INTO vendas (
    restaurante_id,
    valor_total,
    forma_pagamento,
    status,
    usuario_id
  ) VALUES (
    v_pedido.restaurante_id,
    v_pedido.valor_total,
    p_forma_pagamento,
    'concluida',
    p_usuario_id
  );
  
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
      v_pedido.valor_total,
      'Pedido Avulso #' || v_pedido.numero || ' - ' || v_pedido.cliente_nome,
      'Tipo: ' || v_pedido.tipo || ' - Operador: ' || COALESCE(v_operador_nome, 'Sistema') || ' (' || COALESCE(v_operador_tipo, 'usuario') || ') - ' || (
        SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p_pedido_id AND status != 'cancelado'
      ) || ' itens - Finalizado por: ' || COALESCE(
        (SELECT name FROM profiles WHERE id = p_usuario_id), 'Usuário'
      ),
      p_forma_pagamento,
      p_usuario_id
    );
    
    RAISE NOTICE 'Movimentação registrada no caixa % para operador % (tipo: %): % via %', 
      v_caixa_id, v_operador_nome, v_operador_tipo, v_pedido.valor_total, p_forma_pagamento;
  ELSE
    RAISE WARNING 'Nenhum caixa aberto encontrado para registrar movimentação do pedido % no restaurante %', 
      p_pedido_id, v_pedido.restaurante_id;
  END IF;
END;
$$;

-- Atualizar função finalizar_pagamento_mesa com prioridade para caixa do operador
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

-- Função para debug - verificar caixas abertos por operador
CREATE OR REPLACE FUNCTION debug_caixas_por_operador(p_restaurante_id uuid)
RETURNS TABLE(
  caixa_id uuid,
  operador_id uuid,
  operador_nome text,
  operador_tipo text,
  valor_inicial decimal,
  valor_sistema decimal,
  data_abertura timestamptz,
  total_movimentacoes bigint
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
    (SELECT COUNT(*) FROM movimentacoes_caixa mc WHERE mc.caixa_operador_id = co.id) as total_movimentacoes
  FROM caixas_operadores co
  WHERE co.restaurante_id = p_restaurante_id
    AND co.status = 'aberto'
  ORDER BY co.data_abertura DESC;
END;
$$;

-- Função para verificar se operador específico pode receber movimentações
CREATE OR REPLACE FUNCTION can_operator_receive_movements(
  p_operador_id uuid,
  p_restaurante_id uuid
)
RETURNS TABLE(
  can_receive boolean,
  caixa_id uuid,
  operador_nome text,
  operador_tipo text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caixa RECORD;
BEGIN
  -- Buscar caixa aberto do operador
  SELECT * INTO v_caixa
  FROM caixas_operadores co
  WHERE co.operador_id = p_operador_id
    AND co.status = 'aberto'
    AND co.restaurante_id = p_restaurante_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as can_receive,
      v_caixa.id as caixa_id,
      v_caixa.operador_nome,
      v_caixa.operador_tipo,
      'Operador tem caixa aberto' as reason;
  ELSE
    RETURN QUERY SELECT 
      false as can_receive,
      NULL::uuid as caixa_id,
      NULL::text as operador_nome,
      NULL::text as operador_tipo,
      'Operador não tem caixa aberto' as reason;
  END IF;
END;
$$;

-- Log para verificar se a migração foi aplicada
DO $$
BEGIN
  RAISE NOTICE 'Correção FINAL de movimentações financeiras para funcionários aplicada com sucesso';
  RAISE NOTICE 'Melhorias implementadas:';
  RAISE NOTICE '- Prioridade para caixa do operador atual em finalizar_pagamento_pedido';
  RAISE NOTICE '- Prioridade para caixa do operador atual em finalizar_pagamento_mesa';
  RAISE NOTICE '- Logs detalhados com tipo de operador e nome do finalizador';
  RAISE NOTICE '- Funções de debug para verificar caixas e permissões';
  RAISE NOTICE '- Fallback para qualquer caixa aberto se operador não tiver caixa próprio';
END $$;