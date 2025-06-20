/*
  # Índices para Performance do Sistema de Funcionários

  1. Índices
    - Índices otimizados para consultas frequentes
    - Índices compostos para joins
    - Índices parciais para dados ativos

  2. Performance
    - Otimização de consultas de autenticação
    - Melhoria na busca por CPF
    - Aceleração de limpeza de sessões
*/

-- Índices para employee_auth
CREATE INDEX IF NOT EXISTS idx_employee_auth_cpf 
  ON employee_auth(cpf) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_employee_auth_employee_id 
  ON employee_auth(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_auth_active 
  ON employee_auth(active) 
  WHERE active = true;

-- Índices para employee_sessions
CREATE INDEX IF NOT EXISTS idx_employee_sessions_token 
  ON employee_sessions(token);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee_id 
  ON employee_sessions(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires_at 
  ON employee_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_active 
  ON employee_sessions(employee_id, expires_at) 
  WHERE expires_at > now();

-- Índice composto para autenticação rápida
CREATE INDEX IF NOT EXISTS idx_employee_auth_login 
  ON employee_auth(cpf, active) 
  WHERE active = true;

-- Índice para limpeza de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_employee_sessions_cleanup 
  ON employee_sessions(expires_at) 
  WHERE expires_at < now();