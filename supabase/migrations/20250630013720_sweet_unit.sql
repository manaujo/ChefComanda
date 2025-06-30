-- Add missing policies for employee authentication

-- Add audit functions for employee auth changes
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
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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

-- Create trigger for employee auth changes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_employee_auth_trigger'
  ) THEN
    CREATE TRIGGER audit_employee_auth_trigger
      AFTER INSERT OR UPDATE OR DELETE ON employee_auth
      FOR EACH ROW
      EXECUTE FUNCTION audit_employee_auth_changes();
  END IF;
END
$$;

-- Add audit function for employee sessions
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

-- Create trigger for employee sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_employee_sessions_trigger'
  ) THEN
    CREATE TRIGGER audit_employee_sessions_trigger
      AFTER INSERT OR DELETE ON employee_sessions
      FOR EACH ROW
      EXECUTE FUNCTION audit_employee_sessions();
  END IF;
END
$$;

-- Function to clean up employee data when deleted
CREATE OR REPLACE FUNCTION cleanup_employee_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove authentication
  DELETE FROM employee_auth WHERE employee_id = OLD.id;
  
  -- Remove sessions
  DELETE FROM employee_sessions WHERE employee_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for employee cleanup if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_employee_trigger'
  ) THEN
    CREATE TRIGGER cleanup_employee_trigger
      BEFORE DELETE ON employees
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_employee_on_delete();
  END IF;
END
$$;

-- Add policy for anon users to create sessions during login
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_sessions' AND policyname = 'Allow session creation for valid employees'
  ) THEN
    CREATE POLICY "Allow session creation for valid employees"
      ON employee_sessions
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 
          FROM employees 
          WHERE employees.id = employee_sessions.employee_id 
          AND employees.active = true
        )
      );
  END IF;
END
$$;

-- Add function to check user status
CREATE OR REPLACE FUNCTION check_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user is deactivated, remove all sessions
  IF NEW.active = false AND OLD.active = true THEN
    DELETE FROM employee_sessions WHERE employee_id = NEW.id;
    
    -- Log the deactivation
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details
    ) VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'deactivate',
      'employee',
      NEW.id::text,
      jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for user status check if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_user_status'
  ) THEN
    CREATE TRIGGER check_user_status
      AFTER UPDATE OF active ON employees
      FOR EACH ROW
      EXECUTE FUNCTION check_user_status();
  END IF;
END
$$;

-- Add function to handle user updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the update
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'update',
    'employee',
    NEW.id::text,
    jsonb_build_object(
      'changes', jsonb_build_object(
        'name', jsonb_build_object('from', OLD.name, 'to', NEW.name),
        'role', jsonb_build_object('from', OLD.role, 'to', NEW.role),
        'active', jsonb_build_object('from', OLD.active, 'to', NEW.active)
      )
    )
  );
  
  RETURN NEW;
END;
$$;