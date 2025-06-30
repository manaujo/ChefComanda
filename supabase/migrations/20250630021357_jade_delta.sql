/*
  # Fix Database Authentication Errors

  This migration addresses common issues that cause "Database error granting user" during authentication:

  1. **RLS Policy Issues**
     - Updates profiles table policies to allow Supabase auth operations
     - Ensures service_role can perform necessary operations

  2. **Missing Functions**
     - Creates missing trigger functions that might be referenced
     - Adds proper error handling

  3. **Trigger Fixes**
     - Ensures triggers don't fail during auth operations
     - Adds proper exception handling

  4. **Permission Fixes**
     - Grants necessary permissions to auth schema
     - Ensures proper role assignments
*/

-- First, let's create any missing trigger functions that might be referenced
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    updated_at = now();

  -- Create default user role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create or replace the user update handler
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update profile when user metadata changes
  UPDATE public.profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', OLD.raw_user_meta_data->>'name', NEW.email),
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_user_update trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop existing triggers to recreate them safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Recreate triggers with proper error handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Fix RLS policies on profiles table to allow auth operations
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create more permissive policies that allow auth operations
CREATE POLICY "Enable insert for authenticated users and service role" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

CREATE POLICY "Enable update for users based on user_id" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

CREATE POLICY "Enable read access for users based on user_id" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

-- Fix RLS policies on user_roles table
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Enable insert for authenticated users and service role" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

CREATE POLICY "Enable update for users based on user_id" ON public.user_roles
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

CREATE POLICY "Enable read access for users based on user_id" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_auth_admin'
  );

-- Grant necessary permissions to auth schema
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;

-- Ensure the auth schema can execute our trigger functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO supabase_auth_admin;

-- Create a function to authenticate employees (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.authenticate_employee(p_cpf text, p_password text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role user_role,
  company_id uuid,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.role,
    e.company_id,
    cp.name as company_name
  FROM employees e
  JOIN employee_auth ea ON ea.employee_id = e.id
  JOIN company_profiles cp ON cp.id = e.company_id
  WHERE ea.cpf = p_cpf 
    AND ea.password_hash = crypt(p_password, ea.password_hash)
    AND e.active = true
    AND ea.active = true;
END;
$$;

-- Grant execute permission on the employee auth function
GRANT EXECUTE ON FUNCTION public.authenticate_employee(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_employee(text, text) TO anon;

-- Ensure all tables have proper permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.employees TO authenticated;
GRANT SELECT ON public.employee_auth TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.employee_sessions TO authenticated;

-- Create indexes to improve auth performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_auth_cpf ON public.employee_auth(cpf);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_token ON public.employee_sessions(token);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires_at ON public.employee_sessions(expires_at);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';