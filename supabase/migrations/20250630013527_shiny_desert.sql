/*
  # Fix Employee Sessions RLS Policy

  1. Security Changes
    - Add INSERT policy for employee_sessions table to allow session creation during login
    - Policy validates that the employee_id exists and is active before allowing session creation
    - Ensures only valid employees can create sessions

  2. Changes Made
    - Create INSERT policy for employee_sessions table
    - Policy checks employee exists and is active in the employees table
    - Allows anon role to insert sessions during authentication process
*/

-- Create INSERT policy for employee_sessions to allow session creation during login
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