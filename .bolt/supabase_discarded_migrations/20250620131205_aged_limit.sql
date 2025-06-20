/*
  # Sistema de Auditoria para Funcionários

  1. Triggers de Auditoria
    - Auditoria de criação de funcionários
    - Auditoria de autenticação
    - Auditoria de alterações de senha
    - Auditoria de sessões

  2. Funções de Log
    - `log_employee_action()` - Log genérico de ações
    - `log_employee_login()` - Log de login
    - `log_employee_logout()` - Log de logout

  3. Limpeza Automática
    - Limpeza de sessões expiradas (agendada)
    - Limpeza de logs antigos
*/

-- Função para log de ações de funcionários
CREATE OR REPLACE FUNCTION log_employee_action(
  p_employee_id uuid,
  p_action_type text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    p_employee_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_details,
    now()
  );
END;
$$;

-- Função para log de login de funcionário
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
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    ip_address,
    created_at
  ) VALUES (
    p_employee_id,
    CASE WHEN p_success THEN 'login_success' ELSE 'login_failed' END,
    'employee_auth',
    p_employee_id::text,
    jsonb_build_object(
      'cpf', p_cpf,
      'success', p_success,
      'timestamp', now()
    ),
    p_ip_address,
    now()
  );
END;
$$;

-- Trigger para auditoria de criação de funcionários
CREATE OR REPLACE FUNCTION audit_employee_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM log_employee_action(
    NEW.id,
    'create',
    'employee',
    NEW.id::text,
    jsonb_build_object(
      'name', NEW.name,
      'cpf', NEW.cpf,
      'role', NEW.role,
      'company_id', NEW.company_id
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_creation_audit_trigger
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_creation();

-- Trigger para auditoria de alterações de funcionários
CREATE OR REPLACE FUNCTION audit_employee_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log apenas se houve mudanças significativas
  IF OLD.name != NEW.name OR 
     OLD.role != NEW.role OR 
     OLD.active != NEW.active THEN
    
    PERFORM log_employee_action(
      NEW.id,
      'update',
      'employee',
      NEW.id::text,
      jsonb_build_object(
        'changes', jsonb_build_object(
          'name', jsonb_build_object('old', OLD.name, 'new', NEW.name),
          'role', jsonb_build_object('old', OLD.role, 'new', NEW.role),
          'active', jsonb_build_object('old', OLD.active, 'new', NEW.active)
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_changes_audit_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_changes();

-- Trigger para auditoria de criação de autenticação
CREATE OR REPLACE FUNCTION audit_employee_auth_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM log_employee_action(
    NEW.employee_id,
    'create',
    'employee_auth',
    NEW.id::text,
    jsonb_build_object(
      'cpf', NEW.cpf,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_auth_creation_audit_trigger
  AFTER INSERT ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_auth_creation();

-- Trigger para auditoria de alterações de senha
CREATE OR REPLACE FUNCTION audit_employee_password_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log apenas se a senha foi alterada
  IF OLD.password_hash != NEW.password_hash THEN
    PERFORM log_employee_action(
      NEW.employee_id,
      'password_change',
      'employee_auth',
      NEW.id::text,
      jsonb_build_object(
        'changed_at', now(),
        'cpf', NEW.cpf
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_password_change_audit_trigger
  AFTER UPDATE ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_password_change();

-- Trigger para auditoria de criação de sessões
CREATE OR REPLACE FUNCTION audit_employee_session_creation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM log_employee_action(
    NEW.employee_id,
    'session_created',
    'employee_session',
    NEW.id::text,
    jsonb_build_object(
      'expires_at', NEW.expires_at,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_session_creation_audit_trigger
  AFTER INSERT ON employee_sessions
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_session_creation();

-- Função para limpeza automática de sessões expiradas
CREATE OR REPLACE FUNCTION auto_cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Remover sessões expiradas há mais de 24 horas
  DELETE FROM employee_sessions 
  WHERE expires_at < (now() - interval '24 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza se houve remoções
  IF deleted_count > 0 THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      details,
      created_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, -- Sistema
      'cleanup',
      'employee_sessions',
      jsonb_build_object(
        'deleted_sessions', deleted_count,
        'cleanup_time', now()
      ),
      now()
    );
  END IF;
END;
$$;

-- Função para limpeza de logs antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(p_days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < (now() - (p_days_to_keep || ' days')::interval)
    AND entity_type IN ('employee_session', 'employee_auth');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter logs de auditoria de funcionários
CREATE OR REPLACE FUNCTION get_employee_audit_logs(
  p_company_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  log_id uuid,
  employee_id uuid,
  employee_name text,
  action_type text,
  entity_type text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    e.name,
    al.action_type,
    al.entity_type,
    al.details,
    al.created_at
  FROM audit_logs al
  JOIN employees e ON e.id = al.user_id
  WHERE e.company_id = p_company_id
    AND al.entity_type IN ('employee', 'employee_auth', 'employee_session')
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;