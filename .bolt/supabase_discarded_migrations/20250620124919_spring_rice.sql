/*
  # Triggers de Auditoria para Sistema de Funcionários

  1. Triggers de Auditoria
    - Log de criação de funcionários
    - Log de alterações de funcionários
    - Log de criação/remoção de autenticação
    - Log de login/logout de funcionários

  2. Funções de Auditoria
    - Registra todas as ações importantes no sistema
*/

-- Função para registrar auditoria de funcionários
CREATE OR REPLACE FUNCTION log_employee_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_type text;
  old_data jsonb;
  new_data jsonb;
  user_id_val uuid;
BEGIN
  -- Determina o tipo de ação
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    new_data := to_jsonb(NEW);
    old_data := null;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    new_data := to_jsonb(NEW);
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    new_data := null;
    old_data := to_jsonb(OLD);
  END IF;

  -- Tenta obter o user_id da empresa
  BEGIN
    IF TG_OP = 'DELETE' THEN
      SELECT cp.user_id INTO user_id_val
      FROM company_profiles cp
      WHERE cp.id = OLD.company_id;
    ELSE
      SELECT cp.user_id INTO user_id_val
      FROM company_profiles cp
      WHERE cp.id = NEW.company_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := null;
  END;

  -- Registra no audit_logs se temos um user_id válido
  IF user_id_val IS NOT NULL THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      user_id_val,
      action_type,
      'employee',
      COALESCE(NEW.id::text, OLD.id::text),
      jsonb_build_object(
        'old_data', old_data,
        'new_data', new_data,
        'table_name', TG_TABLE_NAME,
        'timestamp', now()
      )
    );
  END IF;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Função para registrar auditoria de autenticação
CREATE OR REPLACE FUNCTION log_employee_auth_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_type text;
  old_data jsonb;
  new_data jsonb;
  user_id_val uuid;
  employee_name text;
BEGIN
  -- Determina o tipo de ação
  IF TG_OP = 'INSERT' THEN
    action_type := 'create_auth';
    new_data := to_jsonb(NEW) - 'password_hash'; -- Remove senha do log
    old_data := null;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update_auth';
    new_data := to_jsonb(NEW) - 'password_hash'; -- Remove senha do log
    old_data := to_jsonb(OLD) - 'password_hash'; -- Remove senha do log
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete_auth';
    new_data := null;
    old_data := to_jsonb(OLD) - 'password_hash'; -- Remove senha do log
  END IF;

  -- Obtém informações do funcionário e empresa
  BEGIN
    IF TG_OP = 'DELETE' THEN
      SELECT e.name, cp.user_id INTO employee_name, user_id_val
      FROM employees e
      JOIN company_profiles cp ON cp.id = e.company_id
      WHERE e.id = OLD.employee_id;
    ELSE
      SELECT e.name, cp.user_id INTO employee_name, user_id_val
      FROM employees e
      JOIN company_profiles cp ON cp.id = e.company_id
      WHERE e.id = NEW.employee_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := null;
    employee_name := 'Unknown';
  END;

  -- Registra no audit_logs se temos um user_id válido
  IF user_id_val IS NOT NULL THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      user_id_val,
      action_type,
      'employee_auth',
      COALESCE(NEW.employee_id::text, OLD.employee_id::text),
      jsonb_build_object(
        'employee_name', employee_name,
        'cpf', COALESCE(NEW.cpf, OLD.cpf),
        'old_data', old_data,
        'new_data', new_data,
        'timestamp', now()
      )
    );
  END IF;

  -- Retorna o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Função para registrar login de funcionários
CREATE OR REPLACE FUNCTION log_employee_login(
  p_employee_id uuid,
  p_cpf text,
  p_success boolean,
  p_ip_address inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val uuid;
  employee_name text;
BEGIN
  -- Obtém informações do funcionário e empresa
  BEGIN
    SELECT e.name, cp.user_id INTO employee_name, user_id_val
    FROM employees e
    JOIN company_profiles cp ON cp.id = e.company_id
    WHERE e.id = p_employee_id;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := null;
    employee_name := 'Unknown';
  END;

  -- Registra tentativa de login
  IF user_id_val IS NOT NULL THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details,
      ip_address
    ) VALUES (
      user_id_val,
      CASE WHEN p_success THEN 'employee_login_success' ELSE 'employee_login_failed' END,
      'employee_session',
      p_employee_id::text,
      jsonb_build_object(
        'employee_name', employee_name,
        'cpf', p_cpf,
        'success', p_success,
        'timestamp', now()
      ),
      p_ip_address
    );
  END IF;
END;
$$;

-- Cria os triggers
DROP TRIGGER IF EXISTS employee_audit_trigger ON employees;
CREATE TRIGGER employee_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION log_employee_audit();

DROP TRIGGER IF EXISTS employee_auth_audit_trigger ON employee_auth;
CREATE TRIGGER employee_auth_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION log_employee_auth_audit();

-- Trigger para limpeza automática de sessões expiradas (executado a cada inserção)
CREATE OR REPLACE FUNCTION auto_cleanup_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpa sessões expiradas a cada nova sessão criada
  DELETE FROM employee_sessions WHERE expires_at <= now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_cleanup_sessions_trigger ON employee_sessions;
CREATE TRIGGER auto_cleanup_sessions_trigger
  BEFORE INSERT ON employee_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_cleanup_sessions();