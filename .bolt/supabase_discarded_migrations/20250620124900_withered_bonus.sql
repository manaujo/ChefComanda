/*
  # Funções de Gerenciamento de Funcionários

  1. Funções Utilitárias
    - `get_employee_by_cpf` - Busca funcionário por CPF
    - `update_employee_password` - Atualiza senha do funcionário
    - `deactivate_employee` - Desativa funcionário e sua autenticação

  2. Funções de Sessão
    - `create_employee_session` - Cria nova sessão
    - `destroy_employee_session` - Destroi sessão específica
    - `destroy_all_employee_sessions` - Destroi todas as sessões do funcionário
*/

-- Função para buscar funcionário por CPF
CREATE OR REPLACE FUNCTION get_employee_by_cpf(p_cpf text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  cpf text,
  role text,
  company_id uuid,
  company_name text,
  has_auth boolean,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name,
    e.cpf,
    e.role::text,
    e.company_id,
    cp.name as company_name,
    (ea.id IS NOT NULL) as has_auth,
    ea.last_login
  FROM employees e
  JOIN company_profiles cp ON cp.id = e.company_id
  LEFT JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE e.cpf = p_cpf AND e.active = true;
END;
$$;

-- Função para atualizar senha do funcionário
CREATE OR REPLACE FUNCTION update_employee_password(
  p_employee_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o funcionário existe e está ativo
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = p_employee_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Funcionário não encontrado ou inativo';
  END IF;

  -- Atualiza a senha
  UPDATE employee_auth 
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE employee_id = p_employee_id;

  -- Remove todas as sessões ativas para forçar novo login
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;

  RETURN FOUND;
END;
$$;

-- Função para desativar funcionário
CREATE OR REPLACE FUNCTION deactivate_employee(p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desativa o funcionário
  UPDATE employees 
  SET active = false, updated_at = now()
  WHERE id = p_employee_id;

  -- Desativa a autenticação
  UPDATE employee_auth 
  SET active = false, updated_at = now()
  WHERE employee_id = p_employee_id;

  -- Remove todas as sessões ativas
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;

  RETURN FOUND;
END;
$$;

-- Função para criar sessão de funcionário
CREATE OR REPLACE FUNCTION create_employee_session(
  p_employee_id uuid,
  p_token text,
  p_expires_hours integer DEFAULT 8
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Verifica se o funcionário existe e está ativo
  IF NOT EXISTS (
    SELECT 1 FROM employees e
    JOIN employee_auth ea ON ea.employee_id = e.id
    WHERE e.id = p_employee_id 
    AND e.active = true 
    AND ea.active = true
  ) THEN
    RAISE EXCEPTION 'Funcionário não encontrado ou inativo';
  END IF;

  -- Remove sessões expiradas do funcionário
  DELETE FROM employee_sessions 
  WHERE employee_id = p_employee_id AND expires_at <= now();

  -- Cria nova sessão
  INSERT INTO employee_sessions (employee_id, token, expires_at)
  VALUES (
    p_employee_id, 
    p_token, 
    now() + (p_expires_hours || ' hours')::interval
  )
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

-- Função para destruir sessão específica
CREATE OR REPLACE FUNCTION destroy_employee_session(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM employee_sessions WHERE token = p_token;
  RETURN FOUND;
END;
$$;

-- Função para destruir todas as sessões do funcionário
CREATE OR REPLACE FUNCTION destroy_all_employee_sessions(p_employee_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM employee_sessions 
  WHERE employee_id = p_employee_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para limpeza automática de sessões (para ser executada periodicamente)
CREATE OR REPLACE FUNCTION cleanup_all_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM employee_sessions WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter estatísticas de sessões ativas
CREATE OR REPLACE FUNCTION get_active_employee_sessions_stats()
RETURNS TABLE(
  total_active_sessions bigint,
  unique_employees bigint,
  sessions_expiring_soon bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_active_sessions,
    COUNT(DISTINCT employee_id) as unique_employees,
    COUNT(*) FILTER (WHERE expires_at <= now() + interval '1 hour') as sessions_expiring_soon
  FROM employee_sessions 
  WHERE expires_at > now();
END;
$$;