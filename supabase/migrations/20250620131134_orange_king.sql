/*
  # Índices para Performance do Sistema de Funcionários

  1. Índices Principais
    - Índice único para CPF em employee_auth
    - Índice para employee_id em employee_auth
    - Índice único para token em employee_sessions
    - Índice para employee_id em employee_sessions
    - Índice para expires_at em employee_sessions

  2. Índices Compostos
    - Índice composto para consultas de autenticação
    - Índice para limpeza de sessões expiradas

  3. Índices Parciais
    - Índice apenas para funcionários ativos
    - Índice apenas para sessões não expiradas
*/

-- Índices para employee_auth
CREATE INDEX IF NOT EXISTS idx_employee_auth_employee_id 
  ON employee_auth(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_auth_cpf 
  ON employee_auth(cpf) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_employee_auth_active 
  ON employee_auth(active) WHERE active = true;

-- Índice composto para autenticação rápida
CREATE INDEX IF NOT EXISTS idx_employee_auth_login 
  ON employee_auth(cpf, active) WHERE active = true;

-- Índices para employee_sessions
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee_id 
  ON employee_sessions(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_token 
  ON employee_sessions(token);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires_at 
  ON employee_sessions(expires_at);

-- Índice para sessões ativas (não expiradas)
CREATE INDEX IF NOT EXISTS idx_employee_sessions_active 
  ON employee_sessions(employee_id, expires_at) 
  WHERE expires_at > now();

-- Índice para limpeza de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_employee_sessions_expired 
  ON employee_sessions(expires_at) 
  WHERE expires_at <= now();

-- Índice composto para validação de sessão
CREATE INDEX IF NOT EXISTS idx_employee_sessions_validation 
  ON employee_sessions(token, expires_at) 
  WHERE expires_at > now();

-- Índices para employees (se não existirem)
CREATE INDEX IF NOT EXISTS idx_employees_company_id 
  ON employees(company_id);

CREATE INDEX IF NOT EXISTS idx_employees_active 
  ON employees(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_employees_cpf 
  ON employees(cpf);

-- Índice composto para consultas de funcionários por empresa
CREATE INDEX IF NOT EXISTS idx_employees_company_active 
  ON employees(company_id, active) WHERE active = true;