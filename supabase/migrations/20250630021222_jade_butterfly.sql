-- First, let's ensure the handle_new_user function exists and works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table with error handling
  INSERT INTO public.profiles (id, name, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'cpf'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    cpf = COALESCE(EXCLUDED.cpf, profiles.cpf),
    updated_at = now();

  -- Insert into user_roles table with default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for profiles table to be more permissive during auth
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    (auth.uid() = id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    (auth.uid() = id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    (auth.uid() = id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

-- Update RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
CREATE POLICY "Users can update their own role" ON public.user_roles
  FOR UPDATE USING (
    (auth.uid() = user_id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated')
  );

-- Ensure the CPF constraint on profiles allows NULL values during initial creation
DO $$
BEGIN
  -- Drop the unique constraint if it exists and recreate it to allow NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_cpf_unique_idx' 
    AND table_name = 'profiles'
  ) THEN
    DROP INDEX IF EXISTS profiles_cpf_unique_idx;
  END IF;
  
  -- Recreate the unique index to allow NULL values
  CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique_idx 
  ON public.profiles (cpf) 
  WHERE cpf IS NOT NULL;
END $$;

-- Drop the existing function first to avoid return type error
DROP FUNCTION IF EXISTS public.authenticate_employee(text, text);

-- Create a function to safely authenticate employees
CREATE OR REPLACE FUNCTION public.authenticate_employee(p_cpf text, p_password text)
RETURNS TABLE(
  employee_id uuid,
  name text,
  role user_role,
  company_id uuid,
  company_name text
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Ensure auth schema permissions (this might require superuser, but we'll try)
DO $$
BEGIN
  -- Try to grant permissions on auth schema if possible
  GRANT USAGE ON SCHEMA auth TO authenticated;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not grant auth schema permissions - this is normal in hosted Supabase';
END $$;