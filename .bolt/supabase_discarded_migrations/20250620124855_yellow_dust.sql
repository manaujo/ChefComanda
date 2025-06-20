/*
  # Índices Adicionais para Performance do Sistema de Funcionários

  1. Índices Compostos
    - Para consultas frequentes de autenticação
    - Para limpeza de sessões expiradas
    - Para consultas de funcionários por empresa

  2. Índices Parciais
    - Apenas para registros ativos
    - Para otimizar consultas específicas
*/

-- Índices compostos para employee_auth
CREATE INDEX IF NOT EXISTS employee_auth_active_cpf_idx 
  ON employee_auth(cpf) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS employee_auth_employee_active_idx 
  ON employee_auth(employee_id) 
  WHERE active = true;

-- Índices para employee_sessions
CREATE INDEX IF NOT EXISTS employee_sessions_active_idx 
  ON employee_sessions(employee_id, expires_at) 
  WHERE expires_at > now();

CREATE INDEX IF NOT EXISTS employee_sessions_cleanup_idx 
  ON employee_sessions(expires_at) 
  WHERE expires_at <= now();

-- Índice para employees com company_id
CREATE INDEX IF NOT EXISTS employees_company_active_idx 
  ON employees(company_id, active) 
  WHERE active = true;

-- Índice para consultas de funcionários por role
CREATE INDEX IF NOT EXISTS employees_role_active_idx 
  ON employees(role) 
  WHERE active = true;