/*
  # Fix Trigger Functions Restaurant ID Access

  1. Problem Identified
    - Trigger functions cannot access "restaurante_id" field from NEW/OLD records
    - Error: record "new" has no field "restaurant_id"

  2. Solution
    - Use JSONB operators to access record fields more robustly
    - Convert records to JSONB before extracting fields
    - This bypasses internal PostgreSQL field access issues

  3. Security
    - Maintain all existing functionality
    - Preserve restaurant isolation
    - Keep notification system intact
*/

-- Fix broadcast_restaurant_changes function
CREATE OR REPLACE FUNCTION broadcast_restaurant_changes()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
  notification_data jsonb;
BEGIN
  -- Determinar restaurant_id baseado na tabela usando JSONB operators
  CASE TG_TABLE_NAME
    WHEN 'mesas' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'produtos' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'insumos' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'cardapio_online' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'categorias' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'caixas_operadores' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'comandas' THEN
      -- Para comandas, buscar via mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM mesas m
      WHERE m.id = COALESCE(
        (to_jsonb(NEW) ->> 'mesa_id')::uuid,
        (to_jsonb(OLD) ->> 'mesa_id')::uuid
      );
    WHEN 'itens_comanda' THEN
      -- Para itens_comanda, buscar via comanda -> mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = COALESCE(
        (to_jsonb(NEW) ->> 'comanda_id')::uuid,
        (to_jsonb(OLD) ->> 'comanda_id')::uuid
      );
    WHEN 'vendas' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'movimentacoes_caixa' THEN
      -- Para movimentacoes_caixa, buscar via caixa_operador
      IF (to_jsonb(NEW) ->> 'caixa_operador_id') IS NOT NULL THEN
        SELECT co.restaurante_id INTO restaurant_id
        FROM caixas_operadores co
        WHERE co.id = (to_jsonb(NEW) ->> 'caixa_operador_id')::uuid;
      ELSIF (to_jsonb(OLD) ->> 'caixa_operador_id') IS NOT NULL THEN
        SELECT co.restaurante_id INTO restaurant_id
        FROM caixas_operadores co
        WHERE co.id = (to_jsonb(OLD) ->> 'caixa_operador_id')::uuid;
      END IF;
    ELSE
      restaurant_id := NULL;
  END CASE;

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

-- Fix notify_restaurant_data_change function
CREATE OR REPLACE FUNCTION notify_restaurant_data_change()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_id uuid;
BEGIN
  -- Determinar restaurant_id baseado na tabela usando JSONB operators
  CASE TG_TABLE_NAME
    WHEN 'mesas' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'produtos' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'insumos' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'cardapio_online' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'categorias' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'caixas_operadores' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
    WHEN 'comandas' THEN
      -- Para comandas, buscar via mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM mesas m
      WHERE m.id = COALESCE(
        (to_jsonb(NEW) ->> 'mesa_id')::uuid,
        (to_jsonb(OLD) ->> 'mesa_id')::uuid
      );
    WHEN 'itens_comanda' THEN
      -- Para itens_comanda, buscar via comanda -> mesa
      SELECT m.restaurante_id INTO restaurant_id
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = COALESCE(
        (to_jsonb(NEW) ->> 'comanda_id')::uuid,
        (to_jsonb(OLD) ->> 'comanda_id')::uuid
      );
    WHEN 'vendas' THEN
      restaurant_id := COALESCE(
        (to_jsonb(NEW) ->> 'restaurante_id')::uuid,
        (to_jsonb(OLD) ->> 'restaurante_id')::uuid
      );
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
        'record_id', COALESCE(
          (to_jsonb(NEW) ->> 'id')::uuid,
          (to_jsonb(OLD) ->> 'id')::uuid
        )
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;