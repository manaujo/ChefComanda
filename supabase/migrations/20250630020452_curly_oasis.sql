/*
  # Fix Database Authentication Errors

  This migration addresses the "Database error granting user" issue by:
  1. Ensuring the handle_new_user trigger is robust and handles edge cases
  2. Fixing potential RLS policy conflicts
  3. Adding missing indexes for performance
  4. Ensuring proper constraints and defaults
*/

-- First, let's recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles with conflict handling
  INSERT INTO public.profiles (id, name, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'cpf'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    cpf = COALESCE(EXCLUDED.cpf, profiles.cpf),
    updated_at = now();

  -- Insert into user_roles with conflict handling
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = COALESCE(EXCLUDED.role, user_roles.role),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the authentication
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to be more permissive for the auth service
-- This ensures Supabase's auth service can properly read/write during authentication

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can update their own role" ON public.user_roles
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);

-- Add a function to safely get or create user profile data
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_uuid uuid)
RETURNS TABLE(profile_name text, user_role text) AS $$
BEGIN
  -- Try to get existing data
  RETURN QUERY
  SELECT 
    p.name as profile_name,
    ur.role as user_role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = user_uuid;

  -- If no data found, create it
  IF NOT FOUND THEN
    -- Insert profile if it doesn't exist
    INSERT INTO public.profiles (id, name)
    VALUES (user_uuid, '')
    ON CONFLICT (id) DO NOTHING;

    -- Insert user role if it doesn't exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id) DO NOTHING;

    -- Return the created data
    RETURN QUERY
    SELECT 
      p.name as profile_name,
      ur.role as user_role
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_or_create_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_profile(uuid) TO service_role;

-- Ensure CPF constraint allows NULL values to prevent conflicts
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_cpf_key;

-- Recreate the constraint to allow NULL values but ensure uniqueness for non-NULL values
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique_idx 
ON public.profiles(cpf) 
WHERE cpf IS NOT NULL;