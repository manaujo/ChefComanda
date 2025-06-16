/*
  # Add Company Profile Fields

  1. Changes
    - Add address and contact fields to company_profiles
    - Add proper JSON structure for complex data

  2. Security
    - Maintain existing RLS policies
*/

-- Add address and contact fields
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS contact jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS company_profiles_user_id_idx ON company_profiles (user_id);