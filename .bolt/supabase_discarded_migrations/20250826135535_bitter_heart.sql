/*
  # Corrigir Movimentações Financeiras para Funcionários de Caixa

  1. Problema Identificado
    - Funcionários de caixa não recebem movimentações financeiras ao finalizar pagamentos
    - Apenas a conta principal está recebendo as movimentações
    - Função finalizar_pagamento_pedido não está registrando movimentações para funcionários

  2. Soluções
    - Atualizar função finalizar_pagamento_pedido para buscar caixa do operador atual
    - Garantir que movimentações sejam registradas no caixa correto
    - Melhorar busca de caixa aberto por operador

  3. Segurança
    - Manter isolamento por operador
    - Preservar integridade dos dados financeiros
    - Garantir rastreabilidade das movimentações
*/

-- Atualizar função finalizar_pagamento_pedido para corrigir movimentações de funcionários
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
BEGIN
  -- Buscar dados do pedido
  SELECT * INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  -- Buscar caixa aberto do operador atual (funcionário ou usuário principal)
  SELECT co.id, co.operador_nome INTO v_caixa_id, v_operador_nome
  FROM caixas_operadores co
  WHERE co.operador_id = p_usuario_id
    AND co.status = 'aberto'
    AND co.restaurante_id = v_pedido.restaurante_id;
  
  -- Se não encontrou caixa do operador atual, buscar qualquer caixa aberto do restaurante
  IF v_caixa_id IS NULL THEN
    SELECT co.id, co.operador_nome INTO v_caixa_id, v_operador_nome
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
      'Pedido Rápido #' || v_pedido.numero || ' - ' || v_pedido.cliente_nome,
      'Tipo: ' || v_pedido.tipo || ' - Operador: ' || COALESCE(v_operador_nome, 'Sistema') || ' - ' || (
        SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p_pedido_id AND status != 'cancelado'
      ) || ' itens',
      p_forma_pagamento,
      p_usuario_id
    );
    
    RAISE NOTICE 'Movimentação registrada no caixa % para operador %: %', 
      v_caixa_id, v_operador_nome, v_pedido.valor_total;
  ELSE
    RAISE NOTICE 'Nenhum caixa aberto encontrado para registrar movimentação do pedido %', p_pedido_id;
  END IF;
END;
$$;

-- Atualizar função finalizarPagamento para mesas também corrigir para funcionários
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
  
  -- Buscar caixa aberto do operador atual (funcionário ou usuário principal)
  SELECT co.id, co.operador_nome INTO v_caixa_id, v_operador_nome
  FROM caixas_operadores co
  WHERE co.operador_id = p_usuario_id
    AND co.status = 'aberto'
    AND co.restaurante_id = v_mesa.restaurante_id;
  
  -- Se não encontrou caixa do operador atual, buscar qualquer caixa aberto do restaurante
  IF v_caixa_id IS NULL THEN
    SELECT co.id, co.operador_nome INTO v_caixa_id, v_operador_nome
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
      'Operador: ' || COALESCE(v_operador_nome, 'Sistema') || ' - ' || (
        SELECT COUNT(*) FROM itens_comanda WHERE comanda_id = v_comanda.id AND status != 'cancelado'
      ) || ' itens',
      p_forma_pagamento,
      p_usuario_id
    );
    
    RAISE NOTICE 'Movimentação registrada no caixa % para operador %: %', 
      v_caixa_id, v_operador_nome, v_valor_total;
  ELSE
    RAISE NOTICE 'Nenhum caixa aberto encontrado para registrar movimentação da mesa %', p_mesa_id;
  END IF;
END;
$$;

-- Função para debug - verificar caixas abertos
CREATE OR REPLACE FUNCTION debug_caixas_abertos(p_restaurante_id uuid)
RETURNS TABLE(
  caixa_id uuid,
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
    co.id as caixa_id,
    co.operador_id,
    co.operador_nome,
    co.operador_tipo,
    co.valor_inicial,
    co.valor_sistema,
    co.data_abertura
  FROM caixas_operadores co
  WHERE co.restaurante_id = p_restaurante_id
    AND co.status = 'aberto'
  ORDER BY co.data_abertura DESC;
END;
$$;

-- Log para verificar se a migração foi aplicada
DO $$
BEGIN
  RAISE NOTICE 'Correção de movimentações financeiras para funcionários aplicada com sucesso';
  RAISE NOTICE 'Funções atualizadas:';
  RAISE NOTICE '- finalizar_pagamento_pedido: agora busca caixa do operador atual';
  RAISE NOTICE '- finalizar_pagamento_mesa: agora busca caixa do operador atual';
  RAISE NOTICE '- debug_caixas_abertos: função para debug de caixas abertos';
END $$;