/*
  # User Management and Company Profile Schema

  1. New Tables
    - `company_profiles`
      - Stores company information (name, CNPJ)
    - `employees`
      - Stores employee information linked to company
      - Includes CPF and role assignment
    
  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
    - Ensure data isolation between companies
*/

-- Create company profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  cnpj text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT company_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT company_profiles_cnpj_key UNIQUE (cnpj)
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles NOT NULL,
  name text NOT NULL,
  cpf text NOT NULL,
  role user_role NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT employees_cpf_key UNIQUE (cpf)
);

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policies for company profiles
CREATE POLICY "Users can view own company profile"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own company profile"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own company profile"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for employees
CREATE POLICY "Companies can manage their employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_profiles
      WHERE company_profiles.id = employees.company_id
      AND company_profiles.user_id = auth.uid()
    )
  );

-- Function to validate CPF format
CREATE OR REPLACE FUNCTION validate_cpf(cpf text)
RETURNS boolean AS $$
BEGIN
  RETURN cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$';
END;
$$ LANGUAGE plpgsql;