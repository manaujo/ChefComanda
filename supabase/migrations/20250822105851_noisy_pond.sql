/*
  # Corrigir Cálculo de Quantidade de Insumos

  1. Problema Identificado
    - Função registrar_movimentacao_estoque está multiplicando quantidade por 1000
    - Quando adiciona 10, está contando como 10000
    - Precisa corrigir a lógica de cálculo

  2. Solução
    - Atualizar função registrar_movimentacao_estoque
    - Garantir que quantidade seja usada diretamente sem multiplicação
    - Manter precisão decimal correta

  3. Segurança
    - Manter todas as validações existentes
    - Preservar logs de auditoria
    - Manter integridade dos dados
*/

-- Corrigir função registrar_movimentacao_estoque
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
  
  -- Registrar movimentação
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
    p_quantidade,
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