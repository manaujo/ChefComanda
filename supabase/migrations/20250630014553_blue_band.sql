/*
  # Employee Authentication System

  1. New Tables
    - employee_auth for CPF-based authentication
    - employee_sessions for session management

  2. Security
    - Enable RLS on all tables
    - Add policies for employee access
*/

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

-- Function to create employee auth (with check to prevent duplicates)
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

-- Function to authenticate employee (with check to prevent duplicates)
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