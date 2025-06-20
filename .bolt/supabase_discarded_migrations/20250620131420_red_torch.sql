/*
  # Sistema de Autenticação de Funcionários

  1. Novas Tabelas
    - `employee_auth` - Credenciais de autenticação dos funcionários
    - `employee_sessions` - Sessões ativas dos funcionários

  2. Segurança
    - Enable RLS em todas as tabelas
    - Políticas de acesso restrito
    - Hash de senhas com bcrypt

  3. Funções
    - `create_employee_auth` - Criar credenciais para funcionário
    - `authenticate_employee` - Autenticar funcionário
    - `cleanup_expired_sessions` - Limpar sessões expiradas
*/

-- Tabela de autenticação de funcionários
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

-- Tabela de sessões de funcionários
CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
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
    AND employees.id = auth.uid()
  ));

-- Políticas RLS para employee_sessions
CREATE POLICY "Employees can view own sessions"
  ON employee_sessions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = employee_sessions.employee_id
    AND employees.id = auth.uid()
  ));

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
DECLARE
  password_hash text;
BEGIN
  -- Gerar hash da senha
  password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Inserir credenciais
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, password_hash)
  ON CONFLICT (employee_id) DO UPDATE SET
    cpf = EXCLUDED.cpf,
    password_hash = EXCLUDED.password_hash,
    updated_at = now();
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
    e.role::text,
    e.company_id
  FROM employees e
  INNER JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE ea.cpf = p_cpf
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM employee_sessions
  WHERE expires_at < now();
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_employee_auth_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_employee_auth_updated_at
  BEFORE UPDATE ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_auth_updated_at();