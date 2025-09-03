/*
  # Corrigir Rastreamento de Vendas e Movimentações

  1. Triggers Atualizados
    - Trigger para atualizar valor_sistema quando movimentações são adicionadas
    - Trigger para sincronizar dados de vendas em tempo real

  2. Funções Corrigidas
    - Função get_sales_report corrigida para usar dados reais da tabela vendas
    - Função get_dashboard_data corrigida para calcular métricas em tempo real

  3. Índices
    - Índices para melhorar performance das consultas de vendas
    - Índices para relatórios por período
*/

-- Função para atualizar valor do sistema quando movimentações são adicionadas
CREATE OR REPLACE FUNCTION update_caixa_valor_sistema()
RETURNS TRIGGER AS $$
DECLARE
  caixa_record RECORD;
  total_entradas decimal := 0;
  total_saidas decimal := 0;
  novo_valor_sistema decimal;
BEGIN
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
  
  -- Atualizar valor do sistema
  UPDATE caixas_operadores
  SET 
    valor_sistema = novo_valor_sistema,
    updated_at = now()
  WHERE id = caixa_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para atualizar valor do sistema
DROP TRIGGER IF EXISTS update_caixa_valor_sistema_trigger ON movimentacoes_caixa;
CREATE TRIGGER update_caixa_valor_sistema_trigger
  AFTER INSERT OR UPDATE OR DELETE ON movimentacoes_caixa
  FOR EACH ROW
  EXECUTE FUNCTION update_caixa_valor_sistema();

-- Função corrigida para relatório de vendas
CREATE OR REPLACE FUNCTION get_sales_report(
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

-- Função corrigida para dados do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_data(p_restaurante_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  vendas_hoje decimal := 0;
  vendas_mes decimal := 0;
  pedidos_hoje bigint := 0;
  pedidos_mes bigint := 0;
  mesas_ocupadas bigint := 0;
  comandas_abertas bigint := 0;
  ticket_medio decimal := 0;
BEGIN
  -- Vendas e pedidos de hoje
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COALESCE(COUNT(*), 0)
  INTO vendas_hoje, pedidos_hoje
  FROM vendas 
  WHERE restaurante_id = p_restaurante_id 
    AND created_at::date = CURRENT_DATE
    AND status = 'concluida';

  -- Vendas e pedidos do mês
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COALESCE(COUNT(*), 0)
  INTO vendas_mes, pedidos_mes
  FROM vendas 
  WHERE restaurante_id = p_restaurante_id 
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status = 'concluida';

  -- Mesas ocupadas
  SELECT COUNT(*)
  INTO mesas_ocupadas
  FROM mesas 
  WHERE restaurante_id = p_restaurante_id 
    AND status = 'ocupada';

  -- Comandas abertas
  SELECT COUNT(*)
  INTO comandas_abertas
  FROM comandas c
  JOIN mesas m ON c.mesa_id = m.id
  WHERE m.restaurante_id = p_restaurante_id 
    AND c.status = 'aberta';

  -- Calcular ticket médio
  IF pedidos_hoje > 0 THEN
    ticket_medio := vendas_hoje / pedidos_hoje;
  ELSE
    ticket_medio := 0;
  END IF;

  -- Build result
  result := jsonb_build_object(
    'vendas_hoje', vendas_hoje,
    'vendas_mes', vendas_mes,
    'pedidos_hoje', pedidos_hoje,
    'pedidos_mes', pedidos_mes,
    'mesas_ocupadas', mesas_ocupadas,
    'comandas_abertas', comandas_abertas,
    'ticket_medio', ticket_medio
  );

  RETURN result;
END;
$$;

-- Criar índices para melhorar performance das consultas de vendas
CREATE INDEX IF NOT EXISTS idx_vendas_restaurante_status_date ON vendas(restaurante_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_date_status ON vendas(created_at, status) WHERE status = 'concluida';
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_operador_tipo ON movimentacoes_caixa(caixa_operador_id, tipo);

-- Trigger para notificar mudanças em vendas para atualizar dashboard em tempo real
CREATE OR REPLACE FUNCTION notify_sales_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar mudança nas vendas para atualizar dashboard
  PERFORM pg_notify(
    'sales_update',
    json_build_object(
      'restaurant_id', COALESCE(NEW.restaurante_id, OLD.restaurante_id),
      'operation', TG_OP,
      'valor_total', COALESCE(NEW.valor_total, OLD.valor_total),
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de notificação de vendas
DROP TRIGGER IF EXISTS notify_sales_change_trigger ON vendas;
CREATE TRIGGER notify_sales_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION notify_sales_change();