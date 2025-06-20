/*
  # Funções Avançadas para Gerenciamento de Funcionários

  1. Funções de Gerenciamento
    - Gerenciamento de sessões
    - Alteração de senhas
    - Estatísticas de uso
    - Validação de sessões

  2. Utilitários
    - Limpeza automática
    - Relatórios de acesso
    - Controle de sessões ativas
*/

-- Função para criar sessão de funcionário
CREATE OR REPLACE FUNCTION create_employee_session(
  p_employee_id uuid,
  p_token text,
  p_expires_at timestamptz DEFAULT (now() + interval '8 hours')
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Limpar sessões expiradas do funcionário
  DELETE FROM employee_sessions 
  WHERE employee_id = p_employee_id 
    AND expires_at < now();
  
  -- Criar nova sessão
  INSERT INTO employee_sessions (employee_id, token, expires_at)
  VALUES (p_employee_id, p_token, p_expires_at)
  RETURNING id INTO session_id;
  
  -- Atualizar último login
  UPDATE employee_auth 
  SET last_login = now() 
  WHERE employee_id = p_employee_id;
  
  RETURN session_id;
END;
$$;

-- Função para validar sessão
CREATE OR REPLACE FUNCTION validate_employee_session(p_token text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role text,
  company_id uuid,
  expires_at timestamptz
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
    es.expires_at
  FROM employee_sessions es
  INNER JOIN employees e ON e.id = es.employee_id
  INNER JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE es.token = p_token
    AND es.expires_at > now()
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- Função para alterar senha de funcionário
CREATE OR REPLACE FUNCTION change_employee_password(
  p_employee_id uuid,
  p_current_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_hash text;
  new_hash text;
BEGIN
  -- Verificar senha atual
  SELECT password_hash INTO current_hash
  FROM employee_auth
  WHERE employee_id = p_employee_id;
  
  IF current_hash IS NULL THEN
    RETURN false;
  END IF;
  
  IF current_hash != crypt(p_current_password, current_hash) THEN
    RETURN false;
  END IF;
  
  -- Gerar novo hash
  new_hash := crypt(p_new_password, gen_salt('bf'));
  
  -- Atualizar senha
  UPDATE employee_auth
  SET password_hash = new_hash,
      updated_at = now()
  WHERE employee_id = p_employee_id;
  
  -- Invalidar todas as sessões do funcionário
  DELETE FROM employee_sessions
  WHERE employee_id = p_employee_id;
  
  RETURN true;
END;
$$;

-- Função para desativar funcionário
CREATE OR REPLACE FUNCTION deactivate_employee_auth(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desativar autenticação
  UPDATE employee_auth
  SET active = false,
      updated_at = now()
  WHERE employee_id = p_employee_id;
  
  -- Remover todas as sessões
  DELETE FROM employee_sessions
  WHERE employee_id = p_employee_id;
END;
$$;

-- Função para obter estatísticas de sessões
CREATE OR REPLACE FUNCTION get_employee_session_stats(p_company_id uuid)
RETURNS TABLE(
  total_employees bigint,
  active_sessions bigint,
  expired_sessions bigint,
  last_24h_logins bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM employees WHERE company_id = p_company_id AND active = true),
    (SELECT COUNT(*) FROM employee_sessions es 
     INNER JOIN employees e ON e.id = es.employee_id 
     WHERE e.company_id = p_company_id AND es.expires_at > now()),
    (SELECT COUNT(*) FROM employee_sessions es 
     INNER JOIN employees e ON e.id = es.employee_id 
     WHERE e.company_id = p_company_id AND es.expires_at <= now()),
    (SELECT COUNT(*) FROM employee_auth ea 
     INNER JOIN employees e ON e.id = ea.employee_id 
     WHERE e.company_id = p_company_id AND ea.last_login > now() - interval '24 hours');
END;
$$;

-- Função para logout de funcionário
CREATE OR REPLACE FUNCTION logout_employee(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM employee_sessions
  WHERE token = p_token;
  
  RETURN FOUND;
END;
$$;