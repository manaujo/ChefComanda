# ChefComanda

Sistema profissional de gerenciamento para restaurantes, bares e lanchonetes.

## 🚀 Integração Stripe Configurada com Produtos Reais

O sistema está totalmente integrado com seus produtos reais da Stripe.

### 📋 Planos Ativos:
- **Teste**: R$ 1,00/ano
- **Plano Mensal**: R$ 120,00/mês  
- **Plano Trimestral**: R$ 360,00/trimestre (Popular)
- **Plano Anual**: R$ 1.296,00/ano

### 🔑 Price IDs Configurados:
- **Teste**: `price_1S2w0KB4if3rE1yX3gGCzDaQ`
- **Plano Mensal**: `price_1RucPuB4if3rE1yXh76pGzs7`  
- **Plano Trimestral**: `price_1RvfteB4if3rE1yXvpuv438F`
- **Plano Anual**: `price_1RucR4B4if3rE1yXEFat9ZXL`

### 🔐 Webhook Configurado:
- **Signing Secret**: `whsec_yuJa1uPPPblLyaCVxg57px3wYGUZWrjQ`
- **URL**: `https://mgmfxynlgghkuikqqrka.supabase.co/functions/v1/stripe-webhook`

### ✅ Sistema Totalmente Funcional:
1. **Checkout Seguro**: Redirecionamento para Stripe Checkout
2. **Webhook Ativo**: Sincronização automática de assinaturas
3. **Controle de Acesso**: Liberação automática após pagamento
4. **Todos os Planos**: Acesso completo (diferem apenas na duração)
5. **Gestão Completa**: Cancelamento, upgrade, histórico

### 🎯 Funcionalidades do Sistema de Assinaturas:

- ✅ **Produtos Reais**: Integrado com seus produtos da Stripe
- ✅ **Checkout Funcional**: Redirecionamento automático para pagamento
- ✅ **Webhook Configurado**: Sincronização automática de status
- ✅ **Controle de Acesso**: Liberação imediata após pagamento
- ✅ **Gestão de Planos**: Upgrade, cancelamento e histórico
- ✅ **Notificações**: Alertas automáticos de mudanças de plano

## 📱 Funcionalidades do Sistema

- ✅ Controle de mesas e comandas
- ✅ PDV integrado
- ✅ Gestão de estoque com CMV
- ✅ Cardápio digital com QR Code
- ✅ Sistema de funcionários
- ✅ Relatórios avançados
- ✅ Assinaturas Stripe integradas

## 🔧 Webhook Configurado e Ativo

O webhook está configurado e funcionando:

- **URL**: `https://mgmfxynlgghkuikqqrka.supabase.co/functions/v1/stripe-webhook`
- **Secret**: `whsec_yuJa1uPPPblLyaCVxg57px3wYGUZWrjQ`
- **Eventos**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## 🎉 Sistema Pronto!

O ChefComanda está 100% funcional com seus produtos reais da Stripe:

- Assinar qualquer plano diretamente no sistema
- Ter acesso liberado automaticamente após pagamento
- Gerenciar assinaturas (cancelar, fazer upgrade)
- Ver histórico de pagamentos
- Receber notificações de mudanças de plano
- Todos os planos dão acesso completo (diferem apenas na duração)

## 🚀 Como Testar

1. **Acesse a página de planos**: `/dashboard/profile/planos`
2. **Escolha um plano** e clique em "Assinar Agora"
3. **Complete o pagamento** no Stripe Checkout
4. **Retorne ao sistema** - acesso será liberado automaticamente
5. **Verifique o status** na página de planos