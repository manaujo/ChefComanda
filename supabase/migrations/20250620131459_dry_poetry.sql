/*
  # Sistema de Auditoria para Funcionários

  1. Triggers de Auditoria
    - Log de criação de funcionários
    - Log de alterações de senha
    - Log de logins e logouts
    - Log de ativação/desativação

  2. Limpeza Automática
    - Limpeza de sessões expiradas
    - Rotina de manutenção
    - Otimização de performance
*/

-- Trigger para auditoria de criação de employee_auth
CREATE OR REPLACE FUNCTION audit_employee_auth_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      'create',
      'employee_auth',
      NEW.employee_id::text,
      jsonb_build_object(
        'cpf', NEW.cpf,
        'active', NEW.active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      'update',
      'employee_auth',
      NEW.employee_id::text,
      jsonb_build_object(
        'changes', jsonb_build_object(
          'active', jsonb_build_object('from', OLD.active, 'to', NEW.active),
          'password_changed', CASE WHEN OLD.password_hash != NEW.password_hash THEN true ELSE false END
        )
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      auth.uid(),
      'delete',
      'employee_auth',
      OLD.employee_id::text,
      jsonb_build_object(
        'cpf', OLD.cpf
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_employee_auth_trigger
  AFTER INSERT OR UPDATE OR DELETE ON employee_auth
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_auth_changes();

-- Trigger para auditoria de sessões
CREATE OR REPLACE FUNCTION audit_employee_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      NEW.employee_id,
      'login',
      'employee_session',
      NEW.id::text,
      jsonb_build_object(
        'expires_at', NEW.expires_at,
        'ip_address', inet_client_addr()
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      OLD.employee_id,
      'logout',
      'employee_session',
      OLD.id::text,
      jsonb_build_object(
        'session_duration', EXTRACT(EPOCH FROM (now() - OLD.created_at))
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_employee_sessions_trigger
  AFTER INSERT OR DELETE ON employee_sessions
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_sessions();

-- Função para limpeza automática (executar via cron)
CREATE OR REPLACE FUNCTION maintenance_employee_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_sessions integer;
  old_logs integer;
BEGIN
  -- Limpar sessões expiradas
  DELETE FROM employee_sessions
  WHERE expires_at < now() - interval '1 day';
  
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Limpar logs antigos (mais de 90 dias)
  DELETE FROM audit_logs
  WHERE entity_type IN ('employee_session', 'employee_auth')
    AND created_at < now() - interval '90 days';
  
  GET DIAGNOSTICS old_logs = ROW_COUNT;
  
  -- Log da manutenção
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    details
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'maintenance',
    'employee_system',
    jsonb_build_object(
      'deleted_sessions', deleted_sessions,
      'deleted_logs', old_logs,
      'timestamp', now()
    )
  );
END;
$$;

-- Trigger para remover autenticação quando funcionário é excluído
CREATE OR REPLACE FUNCTION cleanup_employee_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remover autenticação
  DELETE FROM employee_auth WHERE employee_id = OLD.id;
  
  -- Remover sessões
  DELETE FROM employee_sessions WHERE employee_id = OLD.id;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER cleanup_employee_trigger
  BEFORE DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_employee_on_delete();

-- Função para relatório de atividade de funcionários
CREATE OR REPLACE FUNCTION employee_activity_report(
  p_company_id uuid,
  p_start_date timestamptz DEFAULT now() - interval '30 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE(
  employee_name text,
  employee_role text,
  total_logins bigint,
  last_login timestamptz,
  total_session_time interval,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.name,
    e.role::text,
    COUNT(al_login.id) as total_logins,
    ea.last_login,
    COALESCE(
      SUM(
        CASE 
          WHEN al_logout.created_at IS NOT NULL 
          THEN al_logout.created_at - al_login.created_at
          ELSE interval '0'
        END
      ), 
      interval '0'
    ) as total_session_time,
    e.active
  FROM employees e
  LEFT JOIN employee_auth ea ON ea.employee_id = e.id
  LEFT JOIN audit_logs al_login ON al_login.user_id = e.id::text 
    AND al_login.action_type = 'login'
    AND al_login.created_at BETWEEN p_start_date AND p_end_date
  LEFT JOIN audit_logs al_logout ON al_logout.user_id = e.id::text 
    AND al_logout.action_type = 'logout'
    AND al_logout.created_at > al_login.created_at
  WHERE e.company_id = p_company_id
  GROUP BY e.id, e.name, e.role, ea.last_login, e.active
  ORDER BY total_logins DESC;
END;
$$;