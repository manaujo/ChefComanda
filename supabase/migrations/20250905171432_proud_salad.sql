/*
  # Corrigir Herança de Plano para Funcionários - Versão Corrigida

  1. Problema Identificado
    - Funcionários não herdam o plano ativo do administrador
    - Sistema verifica plano do funcionário em vez do plano da conta principal
    - SubscriptionGuard bloqueia funcionários mesmo com admin tendo plano ativo
    - Funções anteriores não estão funcionando corretamente

  2. Solução Corrigida
    - Corrigir função employee_has_inherited_subscription
    - Corrigir função user_has_system_access com parâmetros corretos
    - Corrigir função get_effective_subscription_details
    - Atualizar verificações de assinatura para incluir herança

  3. Funcionalidades
    - Funcionários têm acesso baseado no plano do admin
    - Verificação hierárquica de assinatura
    - Manter isolamento por restaurante
    - Debug melhorado para troubleshooting
*/

-- Drop existing functions to recreate with fixes
DROP FUNCTION IF EXISTS employee_has_inherited_subscription(uuid);
DROP FUNCTION IF EXISTS user_has_system_access(uuid);
DROP FUNCTION IF EXISTS get_effective_subscription_details(uuid);
DROP FUNCTION IF EXISTS debug_subscription_inheritance(uuid);

-- Função corrigida para verificar se funcionário tem acesso via plano do admin
CREATE OR REPLACE FUNCTION employee_has_inherited_subscription(p_employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_owner_id uuid;
  v_owner_has_active_plan boolean := false;
BEGIN
  -- Buscar o proprietário do restaurante através do funcionário
  SELECT r.user_id INTO v_restaurant_owner_id
  FROM employees e
  JOIN restaurantes r ON e.restaurant_id = r.id
  WHERE e.auth_user_id = p_employee_user_id
    AND e.active = true
  LIMIT 1;
  
  -- Se não encontrou via restaurant_id, buscar via company_id
  IF v_restaurant_owner_id IS NULL THEN
    SELECT r.user_id INTO v_restaurant_owner_id
    FROM employees e
    JOIN company_profiles cp ON e.company_id = cp.id
    JOIN restaurantes r ON cp.user_id = r.user_id
    WHERE e.auth_user_id = p_employee_user_id
      AND e.active = true
    LIMIT 1;
  END IF;
  
  -- Verificar se o proprietário tem plano ativo
  IF v_restaurant_owner_id IS NOT NULL THEN
    v_owner_has_active_plan := user_has_active_subscription(v_restaurant_owner_id);
  END IF;
  
  RAISE NOTICE 'Employee % - Owner: % - Has Plan: %', p_employee_user_id, v_restaurant_owner_id, v_owner_has_active_plan;
  
  RETURN v_owner_has_active_plan;
END;
$$;

-- Função corrigida para verificar se usuário (funcionário ou admin) tem acesso ao sistema
CREATE OR REPLACE FUNCTION user_has_system_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_employee boolean := false;
  v_has_direct_subscription boolean := false;
  v_has_inherited_access boolean := false;
BEGIN
  -- Verificar se é funcionário
  SELECT EXISTS(
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = p_user_id AND e.active = true
  ) INTO v_is_employee;
  
  IF v_is_employee THEN
    -- Se é funcionário, verificar acesso herdado
    v_has_inherited_access := employee_has_inherited_subscription(p_user_id);
    RAISE NOTICE 'User % is employee with inherited access: %', p_user_id, v_has_inherited_access;
    RETURN v_has_inherited_access;
  ELSE
    -- Se é admin, verificar plano próprio
    v_has_direct_subscription := user_has_active_subscription(p_user_id);
    RAISE NOTICE 'User % is admin with direct subscription: %', p_user_id, v_has_direct_subscription;
    RETURN v_has_direct_subscription;
  END IF;
END;
$$;

-- Função corrigida para obter detalhes da assinatura (própria ou herdada)
CREATE OR REPLACE FUNCTION get_effective_subscription_details(p_user_id uuid)
RETURNS TABLE(
  customer_id text,
  subscription_id text,
  price_id text,
  plan_name text,
  status text,
  current_period_start integer,
  current_period_end integer,
  cancel_at_period_end boolean,
  payment_method_brand text,
  payment_method_last4 text,
  is_active boolean,
  days_remaining integer,
  is_inherited boolean,
  owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_employee boolean := false;
  v_restaurant_owner_id uuid;
  v_owner_name text;
BEGIN
  -- Verificar se é funcionário
  SELECT EXISTS(
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = p_user_id AND e.active = true
  ) INTO v_is_employee;
  
  IF v_is_employee THEN
    -- Buscar proprietário do restaurante
    SELECT r.user_id, p.name INTO v_restaurant_owner_id, v_owner_name
    FROM employees e
    JOIN restaurantes r ON e.restaurant_id = r.id
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE e.auth_user_id = p_user_id
      AND e.active = true
    LIMIT 1;
    
    -- Se não encontrou via restaurant_id, buscar via company_id
    IF v_restaurant_owner_id IS NULL THEN
      SELECT r.user_id, p.name INTO v_restaurant_owner_id, v_owner_name
      FROM employees e
      JOIN company_profiles cp ON e.company_id = cp.id
      JOIN restaurantes r ON cp.user_id = r.user_id
      LEFT JOIN profiles p ON r.user_id = p.id
      WHERE e.auth_user_id = p_user_id
        AND e.active = true
      LIMIT 1;
    END IF;
    
    -- Retornar dados da assinatura do proprietário
    IF v_restaurant_owner_id IS NOT NULL THEN
      RETURN QUERY
      SELECT 
        details.customer_id,
        details.subscription_id,
        details.price_id,
        details.plan_name,
        details.status,
        details.current_period_start,
        details.current_period_end,
        details.cancel_at_period_end,
        details.payment_method_brand,
        details.payment_method_last4,
        details.is_active,
        details.days_remaining,
        true as is_inherited,
        v_owner_name
      FROM get_user_subscription_details(v_restaurant_owner_id) details;
    ELSE
      -- Se não encontrou proprietário, retornar dados vazios mas indicando que é funcionário
      RETURN QUERY
      SELECT 
        NULL::text as customer_id,
        NULL::text as subscription_id,
        NULL::text as price_id,
        'Sem Plano'::text as plan_name,
        'inactive'::text as status,
        NULL::integer as current_period_start,
        NULL::integer as current_period_end,
        false as cancel_at_period_end,
        NULL::text as payment_method_brand,
        NULL::text as payment_method_last4,
        false as is_active,
        0 as days_remaining,
        true as is_inherited,
        'Proprietário não encontrado'::text as owner_name;
    END IF;
  ELSE
    -- Retornar dados da própria assinatura
    RETURN QUERY
    SELECT 
      details.customer_id,
      details.subscription_id,
      details.price_id,
      details.plan_name,
      details.status,
      details.current_period_start,
      details.current_period_end,
      details.cancel_at_period_end,
      details.payment_method_brand,
      details.payment_method_last4,
      details.is_active,
      details.days_remaining,
      false as is_inherited,
      NULL::text as owner_name
    FROM get_user_subscription_details(p_user_id) details;
  END IF;
END;
$$;

-- Função corrigida para debug - verificar herança de plano
CREATE OR REPLACE FUNCTION debug_subscription_inheritance(p_user_id uuid)
RETURNS TABLE(
  current_user_id uuid,
  is_employee boolean,
  restaurant_owner_id uuid,
  owner_name text,
  employee_name text,
  employee_role text,
  restaurant_id uuid,
  restaurant_name text,
  owner_has_subscription boolean,
  employee_has_inherited_access boolean,
  effective_plan_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_employee boolean := false;
  v_restaurant_owner_id uuid;
  v_owner_name text;
  v_employee_name text;
  v_employee_role text;
  v_restaurant_id uuid;
  v_restaurant_name text;
  v_owner_has_subscription boolean := false;
  v_employee_has_inherited_access boolean := false;
  v_effective_plan_name text;
BEGIN
  -- Verificar se é funcionário
  SELECT EXISTS(
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = p_user_id AND e.active = true
  ) INTO v_is_employee;
  
  IF v_is_employee THEN
    -- Buscar dados do funcionário e proprietário
    SELECT 
      e.name, e.role, e.restaurant_id, r.nome, r.user_id, p.name
    INTO 
      v_employee_name, v_employee_role, v_restaurant_id, v_restaurant_name, v_restaurant_owner_id, v_owner_name
    FROM employees e
    LEFT JOIN restaurantes r ON e.restaurant_id = r.id
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE e.auth_user_id = p_user_id
      AND e.active = true
    LIMIT 1;
    
    -- Se não encontrou via restaurant_id, buscar via company_id
    IF v_restaurant_owner_id IS NULL THEN
      SELECT 
        e.name, e.role, r.id, r.nome, r.user_id, p.name
      INTO 
        v_employee_name, v_employee_role, v_restaurant_id, v_restaurant_name, v_restaurant_owner_id, v_owner_name
      FROM employees e
      JOIN company_profiles cp ON e.company_id = cp.id
      JOIN restaurantes r ON cp.user_id = r.user_id
      LEFT JOIN profiles p ON r.user_id = p.id
      WHERE e.auth_user_id = p_user_id
        AND e.active = true
      LIMIT 1;
    END IF;
    
    -- Verificar se proprietário tem plano ativo
    IF v_restaurant_owner_id IS NOT NULL THEN
      v_owner_has_subscription := user_has_active_subscription(v_restaurant_owner_id);
      v_employee_has_inherited_access := employee_has_inherited_subscription(p_user_id);
      
      -- Obter nome do plano efetivo
      SELECT plan_name INTO v_effective_plan_name
      FROM get_user_subscription_details(v_restaurant_owner_id)
      LIMIT 1;
    END IF;
  ELSE
    -- Se é admin, buscar dados próprios
    SELECT r.id, r.nome INTO v_restaurant_id, v_restaurant_name
    FROM restaurantes r
    WHERE r.user_id = p_user_id;
    
    v_restaurant_owner_id := p_user_id;
    v_owner_has_subscription := user_has_active_subscription(p_user_id);
    
    SELECT name INTO v_owner_name FROM profiles WHERE id = p_user_id;
    
    -- Obter nome do plano próprio
    SELECT plan_name INTO v_effective_plan_name
    FROM get_user_subscription_details(p_user_id)
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT 
    p_user_id as current_user_id,
    v_is_employee,
    v_restaurant_owner_id,
    v_owner_name,
    v_employee_name,
    v_employee_role,
    v_restaurant_id,
    v_restaurant_name,
    v_owner_has_subscription,
    v_employee_has_inherited_access,
    v_effective_plan_name;
END;
$$;

-- Recriar view stripe_user_subscriptions com herança corrigida
DROP VIEW IF EXISTS stripe_user_subscriptions CASCADE;

CREATE VIEW stripe_user_subscriptions AS
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true)
    THEN (
      SELECT r.user_id 
      FROM employees e
      JOIN restaurantes r ON e.restaurant_id = r.id
      WHERE e.auth_user_id = auth.uid() AND e.active = true
      LIMIT 1
    )
    ELSE auth.uid()
  END as user_id,
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  get_plan_name_from_price_id(ss.price_id) as plan_name,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4,
  ss.created_at,
  ss.updated_at,
  user_has_system_access(auth.uid()) as is_active,
  CASE 
    WHEN ss.current_period_end IS NOT NULL 
    THEN CEIL((ss.current_period_end - extract(epoch from now())) / 86400.0)::integer
    ELSE 0
  END as days_remaining,
  EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true) as is_inherited
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.deleted_at IS NULL
  AND (
    -- Dados do próprio usuário se for admin
    (sc.user_id = auth.uid() AND NOT EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true))
    OR
    -- Dados do proprietário se for funcionário
    (EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true) AND sc.user_id = (
      SELECT r.user_id 
      FROM employees e
      JOIN restaurantes r ON e.restaurant_id = r.id
      WHERE e.auth_user_id = auth.uid() AND e.active = true
      LIMIT 1
    ))
  );

-- Recriar view employee_inherited_subscriptions com correções
DROP VIEW IF EXISTS employee_inherited_subscriptions CASCADE;

CREATE VIEW employee_inherited_subscriptions AS
SELECT 
  e.auth_user_id as employee_user_id,
  e.name as employee_name,
  e.role as employee_role,
  r.user_id as owner_user_id,
  p.name as owner_name,
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  get_plan_name_from_price_id(ss.price_id) as plan_name,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4,
  user_has_active_subscription(r.user_id) as is_active,
  true as is_inherited
FROM employees e
JOIN restaurantes r ON e.restaurant_id = r.id
LEFT JOIN profiles p ON r.user_id = p.id
LEFT JOIN stripe_customers sc ON r.user_id = sc.user_id AND sc.deleted_at IS NULL
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE e.active = true
  AND e.auth_user_id = auth.uid();

-- Função para verificar se funcionário específico tem acesso (para uso em RLS)
CREATE OR REPLACE FUNCTION check_employee_subscription_access(p_employee_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_user_id uuid;
  v_has_access boolean := false;
BEGIN
  -- Buscar proprietário do restaurante
  SELECT r.user_id INTO v_owner_user_id
  FROM employees e
  JOIN restaurantes r ON e.restaurant_id = r.id
  WHERE e.auth_user_id = p_employee_user_id
    AND e.active = true
  LIMIT 1;
  
  -- Se não encontrou via restaurant_id, buscar via company_id
  IF v_owner_user_id IS NULL THEN
    SELECT r.user_id INTO v_owner_user_id
    FROM employees e
    JOIN company_profiles cp ON e.company_id = cp.id
    JOIN restaurantes r ON cp.user_id = r.user_id
    WHERE e.auth_user_id = p_employee_user_id
      AND e.active = true
    LIMIT 1;
  END IF;
  
  -- Verificar se proprietário tem assinatura ativa
  IF v_owner_user_id IS NOT NULL THEN
    SELECT user_has_active_subscription(v_owner_user_id) INTO v_has_access;
  END IF;
  
  RETURN v_has_access;
END;
$$;

-- Função para obter dados completos de herança (para debug)
CREATE OR REPLACE FUNCTION get_inheritance_debug_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_is_employee boolean;
  v_employee_data jsonb;
  v_owner_data jsonb;
  v_subscription_data jsonb;
BEGIN
  -- Verificar se é funcionário
  SELECT EXISTS(
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = p_user_id AND e.active = true
  ) INTO v_is_employee;
  
  -- Coletar dados do funcionário
  SELECT to_jsonb(e.*) INTO v_employee_data
  FROM employees e
  WHERE e.auth_user_id = p_user_id AND e.active = true
  LIMIT 1;
  
  -- Coletar dados do proprietário
  IF v_is_employee THEN
    SELECT to_jsonb(row(r.user_id, p.name, r.nome)) INTO v_owner_data
    FROM employees e
    JOIN restaurantes r ON e.restaurant_id = r.id
    LEFT JOIN profiles p ON r.user_id = p.id
    WHERE e.auth_user_id = p_user_id AND e.active = true
    LIMIT 1;
    
    -- Se não encontrou, buscar via company_id
    IF v_owner_data IS NULL THEN
      SELECT to_jsonb(row(r.user_id, p.name, r.nome)) INTO v_owner_data
      FROM employees e
      JOIN company_profiles cp ON e.company_id = cp.id
      JOIN restaurantes r ON cp.user_id = r.user_id
      LEFT JOIN profiles p ON r.user_id = p.id
      WHERE e.auth_user_id = p_user_id AND e.active = true
      LIMIT 1;
    END IF;
  END IF;
  
  -- Coletar dados da assinatura
  SELECT to_jsonb(details.*) INTO v_subscription_data
  FROM get_effective_subscription_details(p_user_id) details
  LIMIT 1;
  
  -- Montar resultado
  result := jsonb_build_object(
    'user_id', p_user_id,
    'is_employee', v_is_employee,
    'employee_data', v_employee_data,
    'owner_data', v_owner_data,
    'subscription_data', v_subscription_data,
    'has_system_access', user_has_system_access(p_user_id),
    'timestamp', extract(epoch from now())
  );
  
  RETURN result;
END;
$$;

-- Atualizar stripe_user_invoices view para funcionários também
DROP VIEW IF EXISTS stripe_user_invoices CASCADE;

CREATE VIEW stripe_user_invoices AS
SELECT 
  si.id,
  si.invoice_id,
  si.subscription_id,
  si.customer_id,
  si.amount_paid,
  si.currency,
  si.status,
  si.created_at,
  CASE 
    WHEN EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true)
    THEN (
      SELECT r.user_id 
      FROM employees e
      JOIN restaurantes r ON e.restaurant_id = r.id
      WHERE e.auth_user_id = auth.uid() AND e.active = true
      LIMIT 1
    )
    ELSE auth.uid()
  END as user_id
FROM stripe_invoices si
JOIN stripe_customers sc ON si.customer_id = sc.customer_id
WHERE sc.deleted_at IS NULL
  AND (
    -- Invoices do próprio usuário se for admin
    (sc.user_id = auth.uid() AND NOT EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true))
    OR
    -- Invoices do proprietário se for funcionário
    (EXISTS(SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND active = true) AND sc.user_id = (
      SELECT r.user_id 
      FROM employees e
      JOIN restaurantes r ON e.restaurant_id = r.id
      WHERE e.auth_user_id = auth.uid() AND e.active = true
      LIMIT 1
    ))
  );

-- Criar índices para melhorar performance das consultas de herança
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_active_restaurant 
ON employees(auth_user_id, restaurant_id) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_employees_company_active 
ON employees(company_id) 
WHERE active = true;

-- Log da correção
DO $$
BEGIN
  RAISE NOTICE '🔧 Sistema de herança de plano para funcionários CORRIGIDO com sucesso!';
  RAISE NOTICE '📋 Funcionalidades corrigidas:';
  RAISE NOTICE '- employee_has_inherited_subscription: verifica herança com parâmetros corretos';
  RAISE NOTICE '- user_has_system_access: verifica acesso (próprio ou herdado) com parâmetros corretos';
  RAISE NOTICE '- get_effective_subscription_details: obtém detalhes da assinatura efetiva';
  RAISE NOTICE '- debug_subscription_inheritance: função para debug da herança';
  RAISE NOTICE '- stripe_user_subscriptions: view atualizada com herança';
  RAISE NOTICE '- stripe_user_invoices: view atualizada para funcionários';
  RAISE NOTICE '✅ Agora funcionários DEVEM herdar o acesso do plano da conta principal!';
  RAISE NOTICE '🐛 Use SELECT * FROM debug_subscription_inheritance(auth.uid()) para debug';
END $$;