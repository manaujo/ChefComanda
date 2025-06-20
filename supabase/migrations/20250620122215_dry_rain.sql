/*
  # Create audit logs view with user information

  1. New Views
    - `audit_logs_with_user_info`
      - Joins audit_logs with auth.users and user_roles
      - Provides user email, name, and role information
      - Enables easier querying of audit logs with user context

  2. Security
    - View inherits RLS policies from underlying tables
    - Only accessible to authenticated users who can access audit_logs
*/

-- Create a view that joins audit logs with user information
CREATE OR REPLACE VIEW audit_logs_with_user_info AS
SELECT 
  al.*,
  p.name as user_name,
  ur.role as user_role
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
LEFT JOIN user_roles ur ON al.user_id = ur.user_id;

-- Grant access to authenticated users
GRANT SELECT ON audit_logs_with_user_info TO authenticated;

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW audit_logs_with_user_info SET (security_invoker = true);