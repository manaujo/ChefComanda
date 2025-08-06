/*
  # Funções Auxiliares do Sistema

  1. Funções de Autenticação
    - create_employee_auth - Criar autenticação para funcionários
    - authenticate_employee - Autenticar funcionários

  2. Funções de Relatórios
    - get_sales_report - Relatório de vendas
    - get_stock_alerts - Alertas de estoque

  3. Triggers de Auditoria
    - audit_trigger - Trigger genérico de auditoria
*/

-- Function to hash passwords for employees
CREATE OR REPLACE FUNCTION create_employee_auth(
  p_employee_id uuid,
  p_cpf text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, crypt(p_password, gen_salt('bf')))
  ON CONFLICT (employee_id) 
  DO UPDATE SET 
    password_hash = crypt(p_password, gen_salt('bf')),
    cpf = p_cpf;
END;
$$;

-- Function to authenticate employees
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_cpf text,
  p_password text
)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role text,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.role,
    e.company_id
  FROM employees e
  JOIN employee_auth ea ON e.id = ea.employee_id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND e.active = true;
END;
$$;

-- Function to get sales report
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
    AVG(v.valor_total) as ticket_medio
  FROM vendas v
  WHERE v.restaurante_id = p_restaurante_id
    AND v.status = 'concluida'
    AND (p_start_date IS NULL OR v.created_at >= p_start_date)
    AND (p_end_date IS NULL OR v.created_at <= p_end_date)
  GROUP BY v.created_at::date
  ORDER BY data DESC;
END;
$$;

-- Function to get stock alerts
CREATE OR REPLACE FUNCTION get_stock_alerts(p_restaurante_id uuid)
RETURNS TABLE(
  id uuid,
  nome text,
  quantidade_atual decimal,
  quantidade_minima decimal,
  unidade_medida text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nome,
    i.quantidade as quantidade_atual,
    i.quantidade_minima,
    i.unidade_medida,
    CASE 
      WHEN i.quantidade = 0 THEN 'critico'
      WHEN i.quantidade <= i.quantidade_minima THEN 'baixo'
      ELSE 'ok'
    END as status
  FROM insumos i
  WHERE i.restaurante_id = p_restaurante_id
    AND i.ativo = true
    AND i.quantidade <= i.quantidade_minima
  ORDER BY i.quantidade ASC;
END;
$$;

-- Function to get dashboard data
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
  mesas_ocupadas bigint := 0;
  comandas_abertas bigint := 0;
BEGIN
  -- Vendas de hoje
  SELECT COALESCE(SUM(valor_total), 0), COALESCE(COUNT(*), 0)
  INTO vendas_hoje, pedidos_hoje
  FROM vendas 
  WHERE restaurante_id = p_restaurante_id 
    AND created_at::date = CURRENT_DATE
    AND status = 'concluida';

  -- Vendas do mês
  SELECT COALESCE(SUM(valor_total), 0)
  INTO vendas_mes
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

  -- Build result
  result := jsonb_build_object(
    'vendas_hoje', vendas_hoje,
    'vendas_mes', vendas_mes,
    'pedidos_hoje', pedidos_hoje,
    'mesas_ocupadas', mesas_ocupadas,
    'comandas_abertas', comandas_abertas,
    'ticket_medio', CASE WHEN pedidos_hoje > 0 THEN vendas_hoje / pedidos_hoje ELSE 0 END
  );

  RETURN result;
END;
$$;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  audit_user_id uuid;
BEGIN
  -- Get current user ID
  audit_user_id := auth.uid();
  
  -- Skip if no authenticated user
  IF audit_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    audit_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      ELSE to_jsonb(NEW)
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
DO $$
DECLARE
  table_name text;
  audit_tables text[] := ARRAY[
    'mesas', 'produtos', 'comandas', 'itens_comanda', 
    'caixas', 'movimentacoes_caixa', 'vendas', 'employees'
  ];
BEGIN
  FOREACH table_name IN ARRAY audit_tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_%I_trigger ON %I;
      CREATE TRIGGER audit_%I_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION audit_trigger();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;