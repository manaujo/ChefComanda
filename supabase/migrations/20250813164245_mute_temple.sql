/*
  # Sistema de Movimentações de Estoque

  1. Nova Tabela
    - `movimentacoes_estoque` - Registro de entradas e saídas de estoque
      - `id` (uuid, primary key)
      - `restaurante_id` (uuid, foreign key)
      - `insumo_id` (uuid, foreign key)
      - `tipo` (text, 'entrada' ou 'saida')
      - `quantidade` (decimal, quantidade movimentada)
      - `quantidade_anterior` (decimal, quantidade antes da movimentação)
      - `quantidade_atual` (decimal, quantidade após a movimentação)
      - `motivo` (text, motivo da movimentação)
      - `observacao` (text, observações adicionais)
      - `usuario_id` (uuid, usuário que fez a movimentação)
      - `created_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela
    - Políticas para proprietários e funcionários de estoque

  3. Triggers
    - Trigger para registrar movimentações automaticamente
    - Trigger para atualizar estoque
*/

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade decimal(10,3) NOT NULL CHECK (quantidade > 0),
  quantidade_anterior decimal(10,3) NOT NULL,
  quantidade_atual decimal(10,3) NOT NULL,
  motivo text NOT NULL,
  observacao text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Política para proprietários e funcionários de estoque gerenciarem movimentações
CREATE POLICY "Restaurant owners and stock staff can manage movimentacoes_estoque"
  ON movimentacoes_estoque FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'estoque')
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_restaurante_id ON movimentacoes_estoque(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_insumo_id ON movimentacoes_estoque(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_created_at ON movimentacoes_estoque(created_at);

-- Função para registrar movimentação de estoque
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
  
  -- Calcular nova quantidade
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
  
  -- Atualizar quantidade do insumo
  UPDATE insumos 
  SET 
    quantidade = v_nova_quantidade,
    updated_at = now()
  WHERE id = p_insumo_id;
END;
$$;

-- Função para obter histórico de movimentações
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