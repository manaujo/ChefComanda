/*
  # Fix Employee Sessions RLS Policy

  1. Security Changes
    - Update the INSERT policy on employee_sessions table to allow anonymous users
    - This is necessary because employee login happens before authentication
    - The policy still validates that the employee exists and is active

  2. Changes Made
    - Modified INSERT policy to allow both 'anon' and 'authenticated' roles
    - Kept the validation that ensures only valid, active employees can create sessions
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow session creation for valid employees" ON employee_sessions;

-- Create a new INSERT policy that allows both anonymous and authenticated users
-- but still validates that the employee exists and is active
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