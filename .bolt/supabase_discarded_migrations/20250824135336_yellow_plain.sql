/*
  # Criar Tabela para CMV de Produtos

  1. Nova Tabela
    - `cmv_produtos` - Dados de CMV para produtos
      - `id` (uuid, primary key)
      - `restaurante_id` (uuid, foreign key)
      - `produto_id` (uuid, foreign key)
      - `custo_unitario` (decimal, custo unitário do produto)
      - `periodo_inicio` (date, início do período de análise)
      - `periodo_fim` (date, fim do período de análise)
      - `quantidade_vendida` (integer, quantidade vendida no período)
      - `receita_total` (decimal, receita total do produto)
      - `custo_total` (decimal, custo total do produto)
      - `margem_lucro` (decimal, margem de lucro em percentual)
      - `percentual_cmv` (decimal, percentual do CMV)
      - `ativo` (boolean, se o registro está ativo)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela
    - Políticas para proprietários do restaurante

  3. Índices
    - Índices para performance
*/

-- Criar tabela de CMV de produtos
CREATE TABLE IF NOT EXISTS cmv_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE CASCADE,
  custo_unitario decimal(10,2) NOT NULL CHECK (custo_unitario >= 0),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  quantidade_vendida integer DEFAULT 0,
  receita_total decimal(10,2) DEFAULT 0,
  custo_total decimal(10,2) DEFAULT 0,
  margem_lucro decimal(5,2) DEFAULT 0,
  percentual_cmv decimal(5,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurante_id, produto_id, periodo_inicio, periodo_fim)
);

-- Habilitar RLS
ALTER TABLE cmv_produtos ENABLE ROW LEVEL SECURITY;

-- Política para proprietários do restaurante gerenciarem CMV
CREATE POLICY "Restaurant owners and stock staff can manage cmv_produtos"
  ON cmv_produtos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'cmv')
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cmv_produtos_updated_at
  BEFORE UPDATE ON cmv_produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cmv_produtos_restaurante_id ON cmv_produtos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_cmv_produtos_produto_id ON cmv_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_cmv_produtos_periodo ON cmv_produtos(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_cmv_produtos_ativo ON cmv_produtos(ativo);

-- Função para calcular CMV de um produto
CREATE OR REPLACE FUNCTION calcular_cmv_produto(
  p_restaurante_id uuid,
  p_produto_id uuid,
  p_custo_unitario decimal,
  p_periodo_inicio date,
  p_periodo_fim date
)
RETURNS TABLE(
  quantidade_vendida bigint,
  receita_total decimal,
  custo_total decimal,
  margem_lucro decimal,
  percentual_cmv decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantidade bigint := 0;
  v_receita decimal := 0;
  v_custo decimal := 0;
  v_margem decimal := 0;
  v_percentual decimal := 0;
BEGIN
  -- Calcular vendas do produto no período
  SELECT 
    COALESCE(SUM(ic.quantidade), 0),
    COALESCE(SUM(ic.quantidade * ic.preco_unitario), 0)
  INTO v_quantidade, v_receita
  FROM itens_comanda ic
  JOIN comandas c ON ic.comanda_id = c.id
  JOIN mesas m ON c.mesa_id = m.id
  JOIN vendas v ON v.comanda_id = c.id
  WHERE m.restaurante_id = p_restaurante_id
    AND ic.produto_id = p_produto_id
    AND ic.status = 'entregue'
    AND v.status = 'concluida'
    AND v.created_at::date BETWEEN p_periodo_inicio AND p_periodo_fim;
  
  -- Calcular custo total
  v_custo := v_quantidade * p_custo_unitario;
  
  -- Calcular margem de lucro e percentual CMV
  IF v_receita > 0 THEN
    v_margem := ((v_receita - v_custo) / v_receita) * 100;
    v_percentual := (v_custo / v_receita) * 100;
  ELSE
    v_margem := 0;
    v_percentual := 0;
  END IF;
  
  RETURN QUERY SELECT v_quantidade, v_receita, v_custo, v_margem, v_percentual;
END;
$$;

-- Função para obter relatório completo de CMV
CREATE OR REPLACE FUNCTION get_cmv_report(
  p_restaurante_id uuid,
  p_periodo_inicio date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_periodo_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  produto_id uuid,
  produto_nome text,
  categoria text,
  custo_unitario decimal,
  quantidade_vendida bigint,
  receita_total decimal,
  custo_total decimal,
  margem_lucro decimal,
  percentual_cmv decimal,
  periodo_inicio date,
  periodo_fim date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as produto_id,
    p.nome as produto_nome,
    p.categoria,
    cmv.custo_unitario,
    cmv.quantidade_vendida::bigint,
    cmv.receita_total,
    cmv.custo_total,
    cmv.margem_lucro,
    cmv.percentual_cmv,
    cmv.periodo_inicio,
    cmv.periodo_fim
  FROM cmv_produtos cmv
  JOIN produtos p ON cmv.produto_id = p.id
  WHERE cmv.restaurante_id = p_restaurante_id
    AND cmv.ativo = true
    AND cmv.periodo_inicio >= p_periodo_inicio
    AND cmv.periodo_fim <= p_periodo_fim
  ORDER BY cmv.quantidade_vendida DESC, p.nome;
END;
$$;