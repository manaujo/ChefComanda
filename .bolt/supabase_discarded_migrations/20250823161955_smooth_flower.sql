/*
  # Corrigir Movimentações Financeiras Duplicadas

  1. Problema Identificado
    - Movimentações de caixa sendo registradas duas vezes ao finalizar pagamentos
    - Trigger update_caixa_valor_sistema_trigger está sendo executado múltiplas vezes
    - Valor do sistema sendo calculado incorretamente

  2. Soluções
    - Melhorar trigger para evitar loops infinitos
    - Garantir que cada movimentação seja registrada apenas uma vez
    - Corrigir cálculo do valor do sistema

  3. Segurança
    - Manter isolamento por operador
    - Preservar integridade dos dados financeiros
    - Garantir rastreabilidade das movimentações
*/

-- Corrigir trigger para atualizar valor do sistema sem causar loops
CREATE OR REPLACE FUNCTION update_caixa_valor_sistema()
RETURNS TRIGGER AS $$
DECLARE
  caixa_record RECORD;
  total_entradas decimal := 0;
  total_saidas decimal := 0;
  novo_valor_sistema decimal;
BEGIN
  -- Evitar loops infinitos - só processar se for INSERT ou DELETE
  IF TG_OP = 'UPDATE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Buscar dados do caixa
  SELECT * INTO caixa_record
  FROM caixas_operadores
  WHERE id = COALESCE(NEW.caixa_operador_id, OLD.caixa_operador_id);
  
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular totais de movimentações
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0)
  INTO total_entradas, total_saidas
  FROM movimentacoes_caixa
  WHERE caixa_operador_id = caixa_record.id;
  
  -- Calcular novo valor do sistema
  novo_valor_sistema := caixa_record.valor_inicial + total_entradas - total_saidas;
  
  -- Atualizar valor do sistema apenas se mudou
  IF caixa_record.valor_sistema != novo_valor_sistema THEN
    UPDATE caixas_operadores
    SET 
      valor_sistema = novo_valor_sistema,
      updated_at = now()
    WHERE id = caixa_record.id;
    
    -- Log para debug
    RAISE NOTICE 'Valor sistema atualizado para caixa %: % (Entradas: %, Saídas: %)', 
      caixa_record.id, novo_valor_sistema, total_entradas, total_saidas;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger com configuração mais específica
DROP TRIGGER IF EXISTS update_caixa_valor_sistema_trigger ON movimentacoes_caixa;
CREATE TRIGGER update_caixa_valor_sistema_trigger
  AFTER INSERT OR DELETE ON movimentacoes_caixa
  FOR EACH ROW
  EXECUTE FUNCTION update_caixa_valor_sistema();

-- Função para limpar movimentações duplicadas existentes
CREATE OR REPLACE FUNCTION clean_duplicate_cash_movements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Encontrar e remover movimentações duplicadas
  -- Manter apenas a primeira ocorrência de cada movimentação idêntica
  FOR duplicate_record IN
    SELECT 
      caixa_operador_id,
      tipo,
      valor,
      motivo,
      forma_pagamento,
      usuario_id,
      DATE_TRUNC('minute', created_at) as created_minute,
      array_agg(id ORDER BY created_at) as movement_ids
    FROM movimentacoes_caixa
    WHERE motivo LIKE 'Pagamento Mesa %'
    GROUP BY 
      caixa_operador_id, tipo, valor, motivo, forma_pagamento, usuario_id,
      DATE_TRUNC('minute', created_at)
    HAVING COUNT(*) > 1
  LOOP
    -- Manter apenas o primeiro registro, deletar os duplicados
    DELETE FROM movimentacoes_caixa 
    WHERE id = ANY(duplicate_record.movement_ids[2:]);
    
    RAISE NOTICE 'Removidas % movimentações duplicadas para caixa %', 
      array_length(duplicate_record.movement_ids, 1) - 1,
      duplicate_record.caixa_operador_id;
  END LOOP;
END;
$$;

-- Executar limpeza de duplicatas
SELECT clean_duplicate_cash_movements();

-- Função para verificar integridade dos caixas
CREATE OR REPLACE FUNCTION verify_cash_register_integrity()
RETURNS TABLE(
  caixa_id uuid,
  operador_nome text,
  valor_inicial decimal,
  valor_sistema decimal,
  valor_calculado decimal,
  diferenca decimal,
  total_movimentacoes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id as caixa_id,
    co.operador_nome,
    co.valor_inicial,
    co.valor_sistema,
    co.valor_inicial + 
      COALESCE(SUM(CASE WHEN mc.tipo = 'entrada' THEN mc.valor ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN mc.tipo = 'saida' THEN mc.valor ELSE 0 END), 0) as valor_calculado,
    co.valor_sistema - (
      co.valor_inicial + 
      COALESCE(SUM(CASE WHEN mc.tipo = 'entrada' THEN mc.valor ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN mc.tipo = 'saida' THEN mc.valor ELSE 0 END), 0)
    ) as diferenca,
    COUNT(mc.id) as total_movimentacoes
  FROM caixas_operadores co
  LEFT JOIN movimentacoes_caixa mc ON co.id = mc.caixa_operador_id
  WHERE co.status = 'aberto'
  GROUP BY co.id, co.operador_nome, co.valor_inicial, co.valor_sistema
  ORDER BY co.data_abertura DESC;
END;
$$;

-- Criar índice para evitar movimentações duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_cash_movement 
ON movimentacoes_caixa (
  caixa_operador_id, 
  tipo, 
  valor, 
  motivo, 
  forma_pagamento, 
  usuario_id,
  DATE_TRUNC('minute', created_at)
);

-- Log da correção
DO $$
BEGIN
  RAISE NOTICE 'Correção de movimentações duplicadas aplicada com sucesso';
  RAISE NOTICE 'Triggers atualizados para evitar loops infinitos';
  RAISE NOTICE 'Índice único criado para prevenir duplicatas futuras';
END $$;