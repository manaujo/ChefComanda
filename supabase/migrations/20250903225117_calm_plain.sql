/*
  # Adicionar Plano Teste de Volta com Price ID Correto

  1. Plano Teste Adicionado
    - Nome: Teste
    - Preço: R$ 1,00/ano
    - Price ID: price_1S2w0KB4if3rE1yX3gGCzDaQ (ID correto fornecido pelo usuário)

  2. Funções Atualizadas
    - get_plan_name_from_price_id agora inclui o plano Teste
    - Todas as funções mantêm compatibilidade com o novo plano

  3. Segurança
    - Manter todas as políticas RLS existentes
    - Preservar funcionalidade de verificação de assinatura
*/

-- Atualizar função de mapeamento com o Price ID correto do plano Teste
CREATE OR REPLACE FUNCTION get_plan_name_from_price_id(price_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE price_id
    -- Plano Teste com Price ID correto
    WHEN 'price_1S2w0KB4if3rE1yX3gGCzDaQ' THEN 'Teste'
    -- Planos principais
    WHEN 'price_1RucPuB4if3rE1yXh76pGzs7' THEN 'Plano Mensal'
    WHEN 'price_1RvfteB4if3rE1yXvpuv438F' THEN 'Plano Trimestral'
    WHEN 'price_1RucR4B4if3rE1yXEFat9ZXL' THEN 'Plano Anual'
    ELSE 'Plano Desconhecido'
  END;
END;
$$;

-- Log da adição do plano Teste
DO $$
BEGIN
  RAISE NOTICE 'Plano Teste adicionado de volta com sucesso!';
  RAISE NOTICE 'Price ID correto configurado: price_1S2w0KB4if3rE1yX3gGCzDaQ';
  RAISE NOTICE 'Todos os planos agora funcionais:';
  RAISE NOTICE '- Teste: price_1S2w0KB4if3rE1yX3gGCzDaQ (R$ 1,00/ano)';
  RAISE NOTICE '- Plano Mensal: price_1RucPuB4if3rE1yXh76pGzs7 (R$ 120,00/mês)';
  RAISE NOTICE '- Plano Trimestral: price_1RvfteB4if3rE1yXvpuv438F (R$ 360,00/trimestre)';
  RAISE NOTICE '- Plano Anual: price_1RucR4B4if3rE1yXEFat9ZXL (R$ 1.296,00/ano)';
  RAISE NOTICE 'Webhook Secret: whsec_yuJa1uPPPblLyaCVxg57px3wYGUZWrjQ';
  RAISE NOTICE 'Sistema pronto com todos os 4 planos!';
END $$;