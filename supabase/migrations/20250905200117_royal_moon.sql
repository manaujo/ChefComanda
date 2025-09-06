/*
  # Atualizar Permissões do Funcionário de Caixa

  1. Mudanças nas Permissões
    - Funcionário Caixa: REMOVER acesso ao Cardápio (produtos)
    - Funcionário Caixa: ADICIONAR acesso ao Cardápio Online
    - Manter acesso a: PDV, Comandas, Mesas

  2. Permissões Atualizadas
    - Kitchen: 'comandas' (mantido)
    - Waiter: 'mesas', 'comandas', 'cardapio-online' (mantido)
    - Cashier: 'pdv', 'comandas', 'caixa', 'mesas', 'cardapio-online' (removido 'produtos')
    - Stock: 'produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv' (mantido)

  3. Justificativa
    - Funcionário de caixa não precisa gerenciar produtos/cardápio
    - Funcionário de caixa precisa ver cardápio online para atendimento
    - Separação clara de responsabilidades
*/

-- Atualizar função check_employee_permissions para ajustar permissões do caixa
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
      -- Caixa: PDV, Comandas, Mesas, Cardápio Online (REMOVIDO: produtos)
      has_permission := required_permission IN ('pdv', 'comandas', 'caixa', 'mesas', 'cardapio-online');
    WHEN 'stock' THEN
      -- Estoque: Cardápio, Editor, Estoque, Cardápio Online, CMV
      has_permission := required_permission IN ('produtos', 'estoque', 'cardapio-online', 'cardapio-online-editor', 'cmv');
    WHEN 'kitchen' THEN
      -- Cozinha: apenas Comandas
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
  RAISE NOTICE 'Permissões do funcionário de caixa atualizadas com sucesso!';
  RAISE NOTICE 'Cashier agora tem acesso a:';
  RAISE NOTICE '- pdv (PDV)';
  RAISE NOTICE '- comandas (Comandas)';
  RAISE NOTICE '- caixa (Caixa)';
  RAISE NOTICE '- mesas (Mesas)';
  RAISE NOTICE '- cardapio-online (Cardápio Online)';
  RAISE NOTICE 'Cashier NÃO tem mais acesso a:';
  RAISE NOTICE '- produtos (Cardápio/Produtos)';
  RAISE NOTICE 'Funcionário de caixa não verá mais a tela de Cardápio';
END $$;