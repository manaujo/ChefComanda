/*
  # Remover Acesso do Funcionário da Cozinha ao Cardápio

  1. Problema
    - Funcionário da cozinha tem acesso à tela de Cardápio
    - Cozinha deve ter acesso apenas às Comandas

  2. Solução
    - Atualizar função check_employee_permissions
    - Remover 'produtos' das permissões do kitchen
    - Manter apenas 'comandas' para kitchen

  3. Permissões Atualizadas
    - Kitchen: apenas 'comandas'
    - Waiter: 'mesas', 'comandas', 'cardapio-online'
    - Cashier: 'pdv', 'comandas', 'caixa', 'mesas', 'produtos'
    - Stock: 'produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv'
*/

-- Atualizar função check_employee_permissions para remover acesso do kitchen ao cardápio
CREATE OR REPLACE FUNCTION check_employee_permissions(
  employee_user_id uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_role text;
  has_permission boolean := false;
BEGIN
  -- Buscar cargo do funcionário
  SELECT e.role INTO employee_role
  FROM employees e
  WHERE e.auth_user_id = employee_user_id
    AND e.active = true;
  
  -- Verificar permissões baseadas no cargo
  CASE employee_role
    WHEN 'waiter' THEN
      -- Garçom: Mesas, Comandas, Cardápio Online (QR Code)
      has_permission := required_permission IN ('mesas', 'comandas', 'cardapio-online');
    WHEN 'cashier' THEN
      -- Caixa: Comandas, PDV, Mesas, produtos (para ver no PDV)
      has_permission := required_permission IN ('pdv', 'comandas', 'caixa', 'mesas', 'produtos');
    WHEN 'stock' THEN
      -- Estoque: Cardápio, Editor, Estoque, Cardápio Online, CMV
      has_permission := required_permission IN ('produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv');
    WHEN 'kitchen' THEN
      -- Cozinha: APENAS Comandas (removido acesso a produtos/cardápio)
      has_permission := required_permission IN ('comandas');
    WHEN 'admin' THEN
      has_permission := true; -- Admin tem acesso a tudo
    ELSE
      has_permission := false;
  END CASE;
  
  RETURN has_permission;
END;
$$;

-- Log da alteração
DO $$
BEGIN
  RAISE NOTICE 'Permissões do funcionário da cozinha atualizadas com sucesso!';
  RAISE NOTICE 'Kitchen agora tem acesso APENAS a:';
  RAISE NOTICE '- comandas';
  RAISE NOTICE 'Removido acesso a: produtos, cardápio';
  RAISE NOTICE 'Funcionário da cozinha só verá a tela de Comandas';
END $$;