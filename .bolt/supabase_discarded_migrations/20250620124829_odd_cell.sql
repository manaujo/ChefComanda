/*
  # Sistema de Autenticação de Funcionários

  1. Novas Tabelas
    - `employee_auth` - Armazena credenciais de login dos funcionários
    - `employee_sessions` - Gerencia sessões ativas dos funcionários

  2. Funções
    - `create_employee_auth` - Cria autenticação para funcionário
    - `authenticate_employee` - Autentica funcionário com CPF e senha
    - `delete_employee_auth` - Remove autenticação do funcionário

  3. Triggers
    - Trigger para remover autenticação quando funcionário é excluído
*/

-- Tabela para armazenar autenticação dos funcionários
CREATE TABLE IF NOT EXISTS employee_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cpf text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para gerenciar sessões dos funcionários
CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS employee_auth_cpf_idx ON employee_auth(cpf);
CREATE INDEX IF NOT EXISTS employee_auth_employee_id_idx ON employee_auth(employee_id);
CREATE INDEX IF NOT EXISTS employee_sessions_token_idx ON employee_sessions(token);
CREATE INDEX IF NOT EXISTS employee_sessions_expires_at_idx ON employee_sessions(expires_at);

-- Função para criar hash de senha (usando crypt do pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para criar autenticação de funcionário
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
  -- Verifica se o funcionário existe
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Funcionário não encontrado';
  END IF;

  -- Verifica se já existe autenticação para este funcionário
  IF EXISTS (SELECT 1 FROM employee_auth WHERE employee_id = p_employee_id) THEN
    RAISE EXCEPTION 'Funcionário já possui autenticação configurada';
  END IF;

  -- Verifica se o CPF já está em uso
  IF EXISTS (SELECT 1 FROM employee_auth WHERE cpf = p_cpf) THEN
    RAISE EXCEPTION 'CPF já está em uso por outro funcionário';
  END IF;

  -- Cria a autenticação
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, crypt(p_password, gen_salt('bf')));
END;
$$;

-- Função para autenticar funcionário
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_cpf text,
  p_password text
)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role text,
  company_id uuid,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica credenciais e retorna dados do funcionário
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name,
    e.role::text,
    e.company_id,
    cp.name as company_name
  FROM employee_auth ea
  JOIN employees e ON e.id = ea.employee_id
  JOIN company_profiles cp ON cp.id = e.company_id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND ea.active = true
    AND e.active = true;

  -- Atualiza último login se encontrou o usuário
  IF FOUND THEN
    UPDATE employee_auth 
    SET last_login = now() 
    WHERE cpf = p_cpf;
  END IF;
END;
$$;

-- Função para deletar autenticação de funcionário
CREATE OR REPLACE FUNCTION delete_employee_auth(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove todas as sessões ativas
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;
  
  -- Remove a autenticação
  DELETE FROM employee_auth WHERE employee_id = p_employee_id;
END;
$$;

-- Trigger para remover autenticação quando funcionário é excluído
CREATE OR REPLACE FUNCTION handle_employee_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove autenticação quando funcionário é desativado ou excluído
  IF OLD.active = true AND NEW.active = false THEN
    -- Funcionário foi desativado, desativa autenticação
    UPDATE employee_auth SET active = false WHERE employee_id = OLD.id;
    -- Remove sessões ativas
    DELETE FROM employee_sessions WHERE employee_id = OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Cria o trigger
DROP TRIGGER IF EXISTS employee_auth_cleanup_trigger ON employees;
CREATE TRIGGER employee_auth_cleanup_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_employee_deletion();

-- Trigger para limpeza automática de sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM employee_sessions WHERE expires_at < now();
END;
$$;

-- Função para validar sessão de funcionário
CREATE OR REPLACE FUNCTION validate_employee_session(p_token text)
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
  -- Remove sessões expiradas primeiro
  PERFORM cleanup_expired_sessions();
  
  -- Valida a sessão e retorna dados do funcionário
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name,
    e.role::text,
    e.company_id
  FROM employee_sessions es
  JOIN employees e ON e.id = es.employee_id
  JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE es.token = p_token 
    AND es.expires_at > now()
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- RLS (Row Level Security) para as tabelas
ALTER TABLE employee_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_auth
CREATE POLICY "Employees can view own auth data"
  ON employee_auth
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = employee_auth.employee_id 
    AND employees.id = uid()
  ));

-- Políticas RLS para employee_sessions  
CREATE POLICY "Employees can view own sessions"
  ON employee_sessions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = employee_sessions.employee_id 
    AND employees.id = uid()
  ));

-- Política para permitir que administradores gerenciem autenticação de funcionários
CREATE POLICY "Companies can manage their employees auth"
  ON employee_auth
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees e
    JOIN company_profiles cp ON cp.id = e.company_id
    WHERE e.id = employee_auth.employee_id 
    AND cp.user_id = uid()
  ));

CREATE POLICY "Companies can manage their employees sessions"
  ON employee_sessions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees e
    JOIN company_profiles cp ON cp.id = e.company_id
    WHERE e.id = employee_sessions.employee_id 
    AND cp.user_id = uid()
  ));