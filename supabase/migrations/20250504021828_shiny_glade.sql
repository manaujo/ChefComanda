/*
  # Create Default Admin User

  1. Changes
    - Creates default admin user with email and password
    - Assigns admin role to the user
    - Sets user as fixed (non-deletable)
    
  2. Security
    - Password is properly hashed
    - User is marked as email confirmed
*/

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Create auth user if not exists
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'adm.mesa04@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Administrador","is_fixed":true}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'adm.mesa04@gmail.com'
  )
  RETURNING id INTO _user_id;

  -- Add admin role if user was created
  IF _user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_user_id, 'admin');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute function
SELECT create_admin_user();

-- Drop function after use
DROP FUNCTION create_admin_user();