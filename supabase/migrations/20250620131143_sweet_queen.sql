/*
  # Funções de Gerenciamento de Funcionários

  1. Funções de Sessão
    - `create_employee_session()` - Criar sessão de funcionário
    - `validate_employee_session()` - Validar sessão
    - `cleanup_expired_sessions()` - Limpar sessões expiradas

  2. Funções de Gerenciamento
    - `get_employee_by_session()` - Obter funcionário por sessão
    - `update_employee_last_login()` - Atualizar último login
    - `get_employee_stats()` - Estatísticas de funcionários

  3. Funções de Segurança
    - `change_employee_password()` - Alterar senha
    - `deactivate_employee_sessions()` - Desativar todas as sessões
*/

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
  -- Inserir nova sessão
  INSERT INTO employee_sessions (employee_id, token, expires_at)
  VALUES (
    p_employee_id, 
    p_token, 
    now() + (p_expires_hours || ' hours')::interval
  )
  RETURNING id INTO session_id;
  
  -- Atualizar último login
  UPDATE employee_auth 
  SET last_login = now() 
  WHERE employee_id = p_employee_id;
  
  RETURN session_id;
END;
$$;

-- Função para validar sessão de funcionário
CREATE OR REPLACE FUNCTION validate_employee_session(p_token text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role text,
  company_id uuid,
  session_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.role::text,
    e.company_id,
    (es.expires_at > now()) as session_valid
  FROM employee_sessions es
  JOIN employees e ON e.id = es.employee_id
  JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE es.token = p_token
    AND es.expires_at > now()
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM employee_sessions 
  WHERE expires_at <= now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter funcionário por sessão
CREATE OR REPLACE FUNCTION get_employee_by_session(p_token text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  cpf text,
  role text,
  company_id uuid,
  company_name text,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.cpf,
    e.role::text,
    e.company_id,
    cp.name as company_name,
    ea.last_login
  FROM employee_sessions es
  JOIN employees e ON e.id = es.employee_id
  JOIN employee_auth ea ON ea.employee_id = e.id
  JOIN company_profiles cp ON cp.id = e.company_id
  WHERE es.token = p_token
    AND es.expires_at > now()
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- Função para alterar senha de funcionário
CREATE OR REPLACE FUNCTION change_employee_password(
  p_employee_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  password_valid boolean;
BEGIN
  -- Verificar senha atual
  SELECT EXISTS(
    SELECT 1 FROM employee_auth
    WHERE employee_id = p_employee_id
      AND password_hash = crypt(p_old_password, password_hash)
      AND active = true
  ) INTO password_valid;
  
  IF NOT password_valid THEN
    RETURN false;
  END IF;
  
  -- Atualizar senha
  UPDATE employee_auth
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE employee_id = p_employee_id;
  
  -- Invalidar todas as sessões existentes
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;
  
  RETURN true;
END;
$$;

-- Função para desativar todas as sessões de um funcionário
CREATE OR REPLACE FUNCTION deactivate_employee_sessions(p_employee_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter estatísticas de funcionários
CREATE OR REPLACE FUNCTION get_employee_stats(p_company_id uuid)
RETURNS TABLE(
  total_employees bigint,
  active_employees bigint,
  employees_with_auth bigint,
  active_sessions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_employees,
    COUNT(*) FILTER (WHERE e.active = true) as active_employees,
    COUNT(ea.id) as employees_with_auth,
    COUNT(es.id) FILTER (WHERE es.expires_at > now()) as active_sessions
  FROM employees e
  LEFT JOIN employee_auth ea ON ea.employee_id = e.id AND ea.active = true
  LEFT JOIN employee_sessions es ON es.employee_id = e.id AND es.expires_at > now()
  WHERE e.company_id = p_company_id;
END;
$$;

-- Função para renovar sessão
CREATE OR REPLACE FUNCTION renew_employee_session(
  p_token text,
  p_extend_hours integer DEFAULT 8
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE employee_sessions
  SET expires_at = now() + (p_extend_hours || ' hours')::interval
  WHERE token = p_token
    AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- Função para obter sessões ativas de um funcionário
CREATE OR REPLACE FUNCTION get_employee_active_sessions(p_employee_id uuid)
RETURNS TABLE(
  session_id uuid,
  token text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    es.token,
    es.created_at,
    es.expires_at
  FROM employee_sessions es
  WHERE es.employee_id = p_employee_id
    AND es.expires_at > now()
  ORDER BY es.created_at DESC;
END;
$$;