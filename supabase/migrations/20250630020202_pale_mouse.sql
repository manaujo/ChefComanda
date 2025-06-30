/*
  # Fix Employee Authentication System

  1. Changes
    - Safely drop and recreate employee authentication tables
    - Add proper checks to prevent errors when objects already exist
    - Ensure all functions and triggers are properly created or replaced
    
  2. Security
    - Maintain RLS policies for proper data access
    - Ensure audit logging for all employee actions
*/

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS employee_sessions;
DROP TABLE IF EXISTS employee_auth;

-- Create employee authentication table
CREATE TABLE IF NOT EXISTS employee_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  cpf text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee sessions table
CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for employee_auth (with checks to prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_auth' AND policyname = 'Employees can view own auth data'
  ) THEN
    CREATE POLICY "Employees can view own auth data"
      ON employee_auth FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = employee_auth.employee_id
          AND employees.id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Policies for employee_sessions (with checks to prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_sessions' AND policyname = 'Employees can view own sessions'
  ) THEN
    CREATE POLICY "Employees can view own sessions"
      ON employee_sessions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM employees
          WHERE employees.id = employee_sessions.employee_id
          AND employees.id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Policy for session creation (with check to prevent duplicates)
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

-- Function to create employee auth
CREATE OR REPLACE FUNCTION create_employee_auth(
  p_employee_id uuid,
  p_cpf text,
  p_password text
)
RETURNS uuid AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  INSERT INTO employee_auth (employee_id, cpf, password_hash)
  VALUES (p_employee_id, p_cpf, crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_auth_id;
  
  RETURN v_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate employee
CREATE OR REPLACE FUNCTION authenticate_employee(
  p_cpf text,
  p_password text
)
RETURNS TABLE(employee_id uuid, company_id uuid, name text, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.company_id,
    e.name,
    e.role
  FROM employees e
  JOIN employee_auth ea ON ea.employee_id = e.id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND ea.active = true
    AND e.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit employee auth changes
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

-- Create trigger for employee auth changes (with check to prevent duplicates)
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

-- Function to audit employee sessions
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

-- Create trigger for employee sessions (with check to prevent duplicates)
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

-- Function to check user status
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

-- Create trigger for user status check (with check to prevent duplicates)
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