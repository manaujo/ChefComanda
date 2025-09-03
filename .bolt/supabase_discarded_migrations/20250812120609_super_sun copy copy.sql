/*
  # Sistema de Controle de PDV

  1. Nova Tabela
    - `pdv_sessions` - Sessões do PDV por operador
      - `id` (uuid, primary key)
      - `caixa_operador_id` (uuid, foreign key)
      - `operador_id` (uuid, ID do operador)
      - `operador_nome` (text, nome do operador)
      - `total_vendas` (decimal, total de vendas da sessão)
      - `quantidade_vendas` (integer, quantidade de vendas)
      - `data_inicio` (timestamp, início da sessão)
      - `data_fim` (timestamp, fim da sessão)
      - `status` (text, 'ativo' ou 'finalizado')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Funções
    - Função para obter relatório de funcionários do PDV
    - Função para calcular estatísticas de operadores

  3. Segurança
    - Enable RLS na nova tabela
    - Políticas para proprietários do restaurante

  4. Triggers
    - Trigger para atualizar totais da sessão quando vendas são registradas
*/

-- Criar tabela de sessões do PDV
CREATE TABLE IF NOT EXISTS pdv_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_operador_id uuid REFERENCES caixas_operadores(id) ON DELETE CASCADE,
  operador_id uuid NOT NULL,
  operador_nome text NOT NULL,
  total_vendas decimal(10,2) DEFAULT 0,
  quantidade_vendas integer DEFAULT 0,
  data_inicio timestamptz DEFAULT now(),
  data_fim timestamptz,
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'finalizado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pdv_sessions ENABLE ROW LEVEL SECURITY;

-- Política para proprietários do restaurante gerenciarem sessões PDV
CREATE POLICY "Restaurant owners can manage pdv_sessions"
  ON pdv_sessions FOR ALL
  TO authenticated
  USING (
    caixa_operador_id IN (
      SELECT co.id FROM caixas_operadores co
      JOIN restaurantes r ON co.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pdv_sessions_updated_at
  BEFORE UPDATE ON pdv_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pdv_sessions_caixa_operador_id ON pdv_sessions(caixa_operador_id);
CREATE INDEX IF NOT EXISTS idx_pdv_sessions_operador_id ON pdv_sessions(operador_id);
CREATE INDEX IF NOT EXISTS idx_pdv_sessions_status ON pdv_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pdv_sessions_data_inicio ON pdv_sessions(data_inicio);

-- Função para obter relatório de funcionários do PDV
CREATE OR REPLACE FUNCTION get_pdv_funcionarios_report(
  p_restaurante_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  operador_id uuid,
  operador_nome text,
  operador_tipo text,
  total_sessoes bigint,
  sessoes_fechadas bigint,
  total_vendas decimal,
  quantidade_vendas bigint,
  ticket_medio decimal,
  tempo_medio_sessao decimal,
  maior_venda decimal,
  menor_venda decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.operador_id,
    co.operador_nome,
    co.operador_tipo,
    COUNT(*) as total_sessoes,
    COUNT(CASE WHEN co.status = 'fechado' THEN 1 END) as sessoes_fechadas,
    COALESCE(SUM(
      (SELECT SUM(v.valor_total) FROM vendas v 
       WHERE v.created_at >= co.data_abertura 
       AND (co.data_fechamento IS NULL OR v.created_at <= co.data_fechamento)
       AND v.restaurante_id = p_restaurante_id)
    ), 0) as total_vendas,
    COALESCE(SUM(
      (SELECT COUNT(*) FROM vendas v 
       WHERE v.created_at >= co.data_abertura 
       AND (co.data_fechamento IS NULL OR v.created_at <= co.data_fechamento)
       AND v.restaurante_id = p_restaurante_id)
    ), 0) as quantidade_vendas,
    COALESCE(AVG(
      (SELECT AVG(v.valor_total) FROM vendas v 
       WHERE v.created_at >= co.data_abertura 
       AND (co.data_fechamento IS NULL OR v.created_at <= co.data_fechamento)
       AND v.restaurante_id = p_restaurante_id)
    ), 0) as ticket_medio,
    COALESCE(AVG(
      CASE WHEN co.data_fechamento IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (co.data_fechamento - co.data_abertura)) / 3600
      ELSE NULL END
    ), 0) as tempo_medio_sessao,
    COALESCE(MAX(
      (SELECT MAX(v.valor_total) FROM vendas v 
       WHERE v.created_at >= co.data_abertura 
       AND (co.data_fechamento IS NULL OR v.created_at <= co.data_fechamento)
       AND v.restaurante_id = p_restaurante_id)
    ), 0) as maior_venda,
    COALESCE(MIN(
      (SELECT MIN(v.valor_total) FROM vendas v 
       WHERE v.created_at >= co.data_abertura 
       AND (co.data_fechamento IS NULL OR v.created_at <= co.data_fechamento)
       AND v.restaurante_id = p_restaurante_id)
    ), 0) as menor_venda
  FROM caixas_operadores co
  WHERE co.restaurante_id = p_restaurante_id
    AND (p_start_date IS NULL OR co.data_abertura >= p_start_date)
    AND (p_end_date IS NULL OR co.data_abertura <= p_end_date)
  GROUP BY co.operador_id, co.operador_nome, co.operador_tipo
  ORDER BY total_vendas DESC;
END;
$$;

-- Trigger para atualizar totais da sessão PDV quando vendas são registradas
CREATE OR REPLACE FUNCTION update_pdv_session_totals()
RETURNS TRIGGER AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Buscar sessão ativa para o período da venda
  SELECT ps.* INTO session_record
  FROM pdv_sessions ps
  JOIN caixas_operadores co ON ps.caixa_operador_id = co.id
  WHERE co.restaurante_id = NEW.restaurante_id
    AND ps.status = 'ativo'
    AND NEW.created_at >= ps.data_inicio
    AND (ps.data_fim IS NULL OR NEW.created_at <= ps.data_fim)
  LIMIT 1;

  -- Se encontrou uma sessão, atualizar os totais
  IF FOUND THEN
    UPDATE pdv_sessions 
    SET 
      total_vendas = (
        SELECT COALESCE(SUM(v.valor_total), 0)
        FROM vendas v
        JOIN caixas_operadores co ON co.restaurante_id = v.restaurante_id
        WHERE co.id = session_record.caixa_operador_id
          AND v.created_at >= session_record.data_inicio
          AND (session_record.data_fim IS NULL OR v.created_at <= session_record.data_fim)
          AND v.status = 'concluida'
      ),
      quantidade_vendas = (
        SELECT COALESCE(COUNT(*), 0)
        FROM vendas v
        JOIN caixas_operadores co ON co.restaurante_id = v.restaurante_id
        WHERE co.id = session_record.caixa_operador_id
          AND v.created_at >= session_record.data_inicio
          AND (session_record.data_fim IS NULL OR v.created_at <= session_record.data_fim)
          AND v.status = 'concluida'
      ),
      updated_at = now()
    WHERE id = session_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas vendas
DROP TRIGGER IF EXISTS update_pdv_session_totals_trigger ON vendas;
CREATE TRIGGER update_pdv_session_totals_trigger
  AFTER INSERT ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION update_pdv_session_totals();