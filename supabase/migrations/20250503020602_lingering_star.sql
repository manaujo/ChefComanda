/*
  # User Roles and Notifications Schema

  1. New Tables
    - `user_roles`
      - Stores user role assignments (admin, kitchen, waiter)
    - `notifications`
      - Stores push notification tokens and messages
    
  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'kitchen', 'waiter');

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  token text NOT NULL,
  device_type text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT push_tokens_token_key UNIQUE (token)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for push tokens
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);