/*
  # Sistema de Autenticação de Funcionários

  1. Novas Tabelas
    - `employee_auth`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key para employees)
      - `cpf` (text, unique)
      - `password_hash` (text)
      - `active` (boolean)
      - `last_login` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `employee_sessions`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key para employees)
      - `token` (text, unique)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)

  2. Funções
    - `create_employee_auth()` - Criar conta de funcionário
    - `authenticate_employee()` - Autenticar funcionário
    - `delete_employee_auth()` - Remover conta de funcionário

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso por empresa
    - Hash de senhas com bcrypt
*/

-- Extensão para criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Habilitar RLS
ALTER TABLE employee_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_auth
CREATE POLICY "Employees can view own auth data"
  ON employee_auth
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_auth.employee_id
      AND employees.id = auth.uid()
    )
  );

-- Políticas RLS para employee_sessions
CREATE POLICY "Employees can view own sessions"
  ON employee_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_sessions.employee_id
      AND employees.id = auth.uid()
    )
  );

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
  -- Inserir dados de autenticação
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
  FROM employee_auth ea
  JOIN employees e ON e.id = ea.employee_id
  WHERE ea.cpf = p_cpf
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND ea.active = true
    AND e.active = true;
END;
$$;

-- Função para remover autenticação de funcionário
CREATE OR REPLACE FUNCTION delete_employee_auth(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remover sessões ativas
  DELETE FROM employee_sessions WHERE employee_id = p_employee_id;
  
  -- Remover dados de autenticação
  DELETE FROM employee_auth WHERE employee_id = p_employee_id;
END;
$$;

-- Trigger para remover autenticação quando funcionário é desativado
CREATE OR REPLACE FUNCTION handle_employee_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o funcionário foi desativado, remover autenticação
  IF OLD.active = true AND NEW.active = false THEN
    PERFORM delete_employee_auth(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_deactivation_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_employee_deactivation();

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

CREATE TRIGGER update_employee_auth_updated_at_trigger
  BEFORE UPDATE ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_auth_updated_at();