/*
  # Sistema de Pedidos Rápidos (Balcão/Delivery)

  1. Nova Tabela
    - `pedidos` - Pedidos sem mesa (balcão, delivery, rápido)
      - `id` (uuid, primary key)
      - `restaurante_id` (uuid, foreign key)
      - `numero` (integer, número sequencial do pedido)
      - `cliente_nome` (text, nome do cliente)
      - `cliente_telefone` (text, telefone do cliente - opcional)
      - `tipo` (text, 'balcao', 'delivery', 'rapido')
      - `status` (text, 'aberto', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado')
      - `valor_total` (decimal, valor total do pedido)
      - `observacao` (text, observações gerais do pedido)
      - `endereco_entrega` (text, endereço para delivery - opcional)
      - `usuario_id` (uuid, usuário que criou o pedido)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Nova Tabela
    - `itens_pedido` - Itens dos pedidos rápidos
      - `id` (uuid, primary key)
      - `pedido_id` (uuid, foreign key)
      - `produto_id` (uuid, foreign key)
      - `quantidade` (integer, quantidade do item)
      - `preco_unitario` (decimal, preço unitário no momento do pedido)
      - `observacao` (text, observações do item)
      - `status` (text, 'pendente', 'preparando', 'pronto', 'entregue', 'cancelado')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  3. Sequência
    - Sequência para numeração automática dos pedidos por restaurante

  4. Segurança
    - Enable RLS nas novas tabelas
    - Políticas para proprietários e funcionários autorizados

  5. Triggers
    - Trigger para atualizar valor total do pedido
    - Trigger para gerar número sequencial
    - Trigger para notificações em tempo real

  6. Índices
    - Índices para performance
*/

-- Criar tabela de pedidos rápidos
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  cliente_nome text NOT NULL,
  cliente_telefone text,
  tipo text NOT NULL CHECK (tipo IN ('balcao', 'delivery', 'rapido')),
  status text DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado')),
  valor_total decimal(10,2) DEFAULT 0,
  observacao text,
  endereco_entrega text,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurante_id, numero)
);

-- Criar tabela de itens dos pedidos
CREATE TABLE IF NOT EXISTS itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade integer DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario decimal(10,2) NOT NULL,
  observacao text,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas para pedidos - proprietários e funcionários de caixa
CREATE POLICY "Restaurant owners and cashiers can manage pedidos"
  ON pedidos FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
    OR
    (
      restaurante_id = get_employee_restaurant(auth.uid())
      AND check_employee_permissions(auth.uid(), 'pdv')
    )
  );

-- Políticas para itens_pedido - proprietários e funcionários autorizados
CREATE POLICY "Restaurant owners and staff can manage itens_pedido"
  ON itens_pedido FOR ALL
  TO authenticated
  USING (
    pedido_id IN (
      SELECT p.id FROM pedidos p
      JOIN restaurantes r ON p.restaurante_id = r.id
      WHERE r.user_id = auth.uid()
    )
    OR
    pedido_id IN (
      SELECT p.id FROM pedidos p
      WHERE p.restaurante_id = get_employee_restaurant(auth.uid())
        AND (
          check_employee_permissions(auth.uid(), 'pdv')
          OR check_employee_permissions(auth.uid(), 'comandas')
        )
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itens_pedido_updated_at
  BEFORE UPDATE ON itens_pedido
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número sequencial do pedido
CREATE OR REPLACE FUNCTION generate_pedido_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_numero integer;
BEGIN
  -- Gerar próximo número para o restaurante
  SELECT COALESCE(MAX(numero), 0) + 1 INTO next_numero
  FROM pedidos
  WHERE restaurante_id = NEW.restaurante_id;
  
  NEW.numero := next_numero;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número do pedido
CREATE TRIGGER generate_pedido_numero_trigger
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION generate_pedido_numero();

-- Trigger para atualizar valor total do pedido
CREATE OR REPLACE FUNCTION update_pedido_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos 
  SET 
    valor_total = (
      SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
      FROM itens_pedido 
      WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
        AND status != 'cancelado'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar total do pedido quando itens mudam
CREATE TRIGGER update_pedido_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
  FOR EACH ROW
  EXECUTE FUNCTION update_pedido_total();

-- Função para finalizar pagamento de pedido
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
BEGIN
  -- Buscar dados do pedido
  SELECT * INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  -- Buscar caixa aberto do operador
  SELECT id INTO v_caixa_id
  FROM caixas_operadores
  WHERE operador_id = p_usuario_id
    AND status = 'aberto'
    AND restaurante_id = v_pedido.restaurante_id;
  
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
      'Pedido #' || v_pedido.numero || ' - ' || v_pedido.cliente_nome,
      v_pedido.tipo || ' - ' || (
        SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p_pedido_id AND status != 'cancelado'
      ) || ' itens',
      p_forma_pagamento,
      p_usuario_id
    );
  END IF;
END;
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante_id ON pedidos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(restaurante_id, numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_status ON itens_pedido(status);

-- Trigger para notificar mudanças em pedidos (realtime para comandas)
CREATE OR REPLACE FUNCTION notify_pedido_changes()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
  notification_data jsonb;
BEGIN
  -- Obter restaurant_id
  restaurant_id := COALESCE(
    (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
    (to_jsonb(OLD) ->> 'restaurante_id')::uuid
  );

  -- Criar dados da notificação
  notification_data := jsonb_build_object(
    'restaurant_id', restaurant_id,
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', COALESCE(
      (to_jsonb(NEW) ->> 'id')::uuid,
      (to_jsonb(OLD) ->> 'id')::uuid
    ),
    'timestamp', extract(epoch from now())
  );

  -- Notificar mudança para comandas
  IF restaurant_id IS NOT NULL THEN
    PERFORM pg_notify('pedidos_changes', notification_data::text);
    PERFORM pg_notify('restaurant_changes', notification_data::text);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de notificação
CREATE TRIGGER notify_pedidos_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION notify_pedido_changes();

CREATE TRIGGER notify_itens_pedido_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
  FOR EACH ROW
  EXECUTE FUNCTION notify_pedido_changes();

-- Função para obter pedidos com itens
CREATE OR REPLACE FUNCTION get_pedidos_with_items(
  p_restaurante_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  numero integer,
  cliente_nome text,
  cliente_telefone text,
  tipo text,
  status text,
  valor_total decimal,
  observacao text,
  endereco_entrega text,
  created_at timestamptz,
  itens jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.numero,
    p.cliente_nome,
    p.cliente_telefone,
    p.tipo,
    p.status,
    p.valor_total,
    p.observacao,
    p.endereco_entrega,
    p.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ip.id,
          'produto_id', ip.produto_id,
          'produto_nome', prod.nome,
          'categoria', prod.categoria,
          'quantidade', ip.quantidade,
          'preco_unitario', ip.preco_unitario,
          'observacao', ip.observacao,
          'status', ip.status
        ) ORDER BY ip.created_at
      ) FILTER (WHERE ip.id IS NOT NULL),
      '[]'::jsonb
    ) as itens
  FROM pedidos p
  LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
  LEFT JOIN produtos prod ON ip.produto_id = prod.id
  WHERE p.restaurante_id = p_restaurante_id
    AND (p_status IS NULL OR p.status = p_status)
  GROUP BY p.id, p.numero, p.cliente_nome, p.cliente_telefone, p.tipo, p.status, 
           p.valor_total, p.observacao, p.endereco_entrega, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;