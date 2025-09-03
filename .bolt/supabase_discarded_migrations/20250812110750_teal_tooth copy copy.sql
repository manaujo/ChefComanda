/*
  # Criar Sistema de Caixa com Operadores

  1. Nova Tabela
    - `caixas_operadores` - Controle de caixa por operador
      - `id` (uuid, primary key)
      - `restaurante_id` (uuid, foreign key)
      - `operador_id` (uuid, ID do operador - pode ser user ou employee)
      - `operador_nome` (text, nome do operador)
      - `operador_tipo` (text, 'funcionario' ou 'usuario')
      - `valor_inicial` (decimal, valor inicial do caixa)
      - `valor_final` (decimal, valor final informado)
      - `valor_sistema` (decimal, valor calculado pelo sistema)
      - `status` (text, 'aberto' ou 'fechado')
      - `data_abertura` (timestamp)
      - `data_fechamento` (timestamp)
      - `observacao` (text, observações do fechamento)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modificações
    - Atualizar tabela `movimentacoes_caixa` para referenciar nova tabela
    - Migrar dados existentes se houver

  3. Segurança
    - Enable RLS na nova tabela
    - Políticas para proprietários do restaurante

  4. Índices
    - Índices para performance
*/

-- Criar tabela de caixas com operadores
CREATE TABLE IF NOT EXISTS caixas_operadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  operador_id uuid NOT NULL,
  operador_nome text NOT NULL,
  operador_tipo text NOT NULL CHECK (operador_tipo IN ('funcionario', 'usuario')),
  valor_inicial decimal(10,2) DEFAULT 0,
  valor_final decimal(10,2),
  valor_sistema decimal(10,2) DEFAULT 0,
  status text DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  data_abertura timestamptz DEFAULT now(),
  data_fechamento timestamptz,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE caixas_operadores ENABLE ROW LEVEL SECURITY;

-- Política para proprietários do restaurante gerenciarem caixas
CREATE POLICY "Restaurant owners can manage caixas_operadores"
  ON caixas_operadores FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_caixas_operadores_updated_at
  BEFORE UPDATE ON caixas_operadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_caixas_operadores_restaurante_id ON caixas_operadores(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_caixas_operadores_operador_id ON caixas_operadores(operador_id);
CREATE INDEX IF NOT EXISTS idx_caixas_operadores_status ON caixas_operadores(status);
CREATE INDEX IF NOT EXISTS idx_caixas_operadores_data_abertura ON caixas_operadores(data_abertura);

-- Migrar dados existentes da tabela caixas para caixas_operadores
DO $$
DECLARE
  caixa_record RECORD;
  user_name text;
BEGIN
  -- Migrar cada registro da tabela caixas antiga
  FOR caixa_record IN 
    SELECT * FROM caixas
  LOOP
    -- Buscar nome do usuário
    SELECT COALESCE(name, 'Usuário') INTO user_name
    FROM profiles 
    WHERE id = caixa_record.usuario_id;
    
    -- Inserir na nova tabela
    INSERT INTO caixas_operadores (
      restaurante_id,
      operador_id,
      operador_nome,
      operador_tipo,
      valor_inicial,
      valor_final,
      valor_sistema,
      status,
      data_abertura,
      data_fechamento,
      observacao,
      created_at,
      updated_at
    ) VALUES (
      caixa_record.restaurante_id,
      caixa_record.usuario_id,
      COALESCE(user_name, 'Usuário'),
      'usuario',
      caixa_record.valor_inicial,
      caixa_record.valor_final,
      caixa_record.valor_sistema,
      caixa_record.status,
      caixa_record.data_abertura,
      caixa_record.data_fechamento,
      caixa_record.observacao,
      caixa_record.created_at,
      caixa_record.updated_at
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Atualizar referências na tabela movimentacoes_caixa
-- Adicionar coluna temporária para mapear para nova tabela
DO $$
BEGIN
  -- Verificar se a coluna já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'movimentacoes_caixa' AND column_name = 'caixa_operador_id'
  ) THEN
    ALTER TABLE movimentacoes_caixa ADD COLUMN caixa_operador_id uuid;
  END IF;
END $$;

-- Mapear movimentações para novos caixas
UPDATE movimentacoes_caixa 
SET caixa_operador_id = co.id
FROM caixas_operadores co
JOIN caixas c ON c.usuario_id = co.operador_id 
  AND c.restaurante_id = co.restaurante_id
  AND c.data_abertura = co.data_abertura
WHERE movimentacoes_caixa.caixa_id = c.id
  AND movimentacoes_caixa.caixa_operador_id IS NULL;

-- Função para obter relatório de caixa por operador
CREATE OR REPLACE FUNCTION get_caixa_operador_report(
  p_restaurante_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  operador_id uuid,
  operador_nome text,
  operador_tipo text,
  total_caixas bigint,
  total_entradas decimal,
  total_saidas decimal,
  total_diferencas decimal,
  media_tempo_operacao decimal
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
    COUNT(*) as total_caixas,
    COALESCE(SUM(
      (SELECT SUM(mc.valor) FROM movimentacoes_caixa mc 
       WHERE mc.caixa_operador_id = co.id AND mc.tipo = 'entrada')
    ), 0) as total_entradas,
    COALESCE(SUM(
      (SELECT SUM(mc.valor) FROM movimentacoes_caixa mc 
       WHERE mc.caixa_operador_id = co.id AND mc.tipo = 'saida')
    ), 0) as total_saidas,
    COALESCE(SUM(
      CASE WHEN co.valor_final IS NOT NULL 
      THEN co.valor_final - co.valor_sistema 
      ELSE 0 END
    ), 0) as total_diferencas,
    COALESCE(AVG(
      CASE WHEN co.data_fechamento IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (co.data_fechamento - co.data_abertura)) / 3600
      ELSE NULL END
    ), 0) as media_tempo_operacao
  FROM caixas_operadores co
  WHERE co.restaurante_id = p_restaurante_id
    AND (p_start_date IS NULL OR co.data_abertura >= p_start_date)
    AND (p_end_date IS NULL OR co.data_abertura <= p_end_date)
  GROUP BY co.operador_id, co.operador_nome, co.operador_tipo
  ORDER BY total_entradas DESC;
END;
$$;