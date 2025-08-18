/*
  # Corrigir Triggers com Campo restaurant_id Inexistente

  1. Problema Identificado
    - Triggers tentam acessar campo "restaurant_id" que não existe na tabela itens_comanda
    - Erro: record "new" has no field "restaurant_id"

  2. Correções
    - Atualizar triggers para usar joins corretos
    - Corrigir função broadcast_restaurant_changes
    - Corrigir função notify_restaurant_data_change

  3. Segurança
    - Manter funcionalidade de notificações
    - Preservar isolamento por restaurante
*/

-- Corrigir função broadcast_restaurant_changes
CREATE OR REPLACE FUNCTION broadcast_restaurant_changes()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
  notification_data jsonb;
BEGIN
  -- Determinar restaurant_id baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'mesas' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'produtos' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'insumos' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'cardapio_online' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'categorias' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'caixas_operadores' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'comandas' THEN
      -- Para comandas, buscar via mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM mesas m
      WHERE m.id = COALESCE(NEW.mesa_id, OLD.mesa_id);
    WHEN 'itens_comanda' THEN
      -- Para itens_comanda, buscar via comanda -> mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = COALESCE(NEW.comanda_id, OLD.comanda_id);
    WHEN 'vendas' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'movimentacoes_caixa' THEN
      -- Para movimentacoes_caixa, buscar via caixa_operador
      IF NEW.caixa_operador_id IS NOT NULL THEN
        SELECT co.restaurante_id INTO restaurant_id
        FROM caixas_operadores co
        WHERE co.id = NEW.caixa_operador_id;
      ELSIF OLD.caixa_operador_id IS NOT NULL THEN
        SELECT co.restaurante_id INTO restaurant_id
        FROM caixas_operadores co
        WHERE co.id = OLD.caixa_operador_id;
      END IF;
    ELSE
      restaurant_id := NULL;
  END CASE;

  -- Criar dados da notificação
  notification_data := jsonb_build_object(
    'restaurant_id', restaurant_id,
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', COALESCE(NEW.id, OLD.id),
    'timestamp', extract(epoch from now())
  );

  -- Notificar mudança se restaurant_id foi encontrado
  IF restaurant_id IS NOT NULL THEN
    -- Notificar via pg_notify para todas as conexões
    PERFORM pg_notify('restaurant_changes', notification_data::text);
    
    -- Notificar via realtime para o canal específico do restaurante
    PERFORM pg_notify(
      'realtime:restaurant:' || restaurant_id::text,
      notification_data::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Corrigir função notify_restaurant_data_change
CREATE OR REPLACE FUNCTION notify_restaurant_data_change()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
BEGIN
  -- Determinar restaurant_id baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'mesas' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'produtos' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'insumos' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'cardapio_online' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'categorias' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'caixas_operadores' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    WHEN 'comandas' THEN
      -- Para comandas, buscar via mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM mesas m
      WHERE m.id = COALESCE(NEW.mesa_id, OLD.mesa_id);
    WHEN 'itens_comanda' THEN
      -- Para itens_comanda, buscar via comanda -> mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = COALESCE(NEW.comanda_id, OLD.comanda_id);
    WHEN 'vendas' THEN
      restaurant_id := COALESCE(NEW.restaurante_id, OLD.restaurante_id);
    ELSE
      restaurant_id := NULL;
  END CASE;

  -- Notificar mudança se restaurant_id foi encontrado
  IF restaurant_id IS NOT NULL THEN
    PERFORM pg_notify(
      'restaurant_data_change',
      json_build_object(
        'restaurant_id', restaurant_id,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recriar triggers com as funções corrigidas
DO $$
DECLARE
  table_name text;
  broadcast_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 
    'caixas_operadores', 'movimentacoes_caixa', 'vendas',
    'insumos', 'cardapio_online', 'categorias'
  ];
  notification_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 'caixas_operadores'
  ];
BEGIN
  -- Recriar triggers de broadcast
  FOREACH table_name IN ARRAY broadcast_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS broadcast_%I_changes_trigger ON %I;
      CREATE TRIGGER broadcast_%I_changes_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION broadcast_restaurant_changes();
    ', table_name, table_name, table_name, table_name);
  END LOOP;

  -- Recriar triggers de notificação
  FOREACH table_name IN ARRAY notification_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS notify_%I_data_change_trigger ON %I;
      CREATE TRIGGER notify_%I_data_change_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION notify_restaurant_data_change();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;