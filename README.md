# ChefComanda

Sistema profissional de gerenciamento para restaurantes, bares e lanchonetes.

## 🚀 Integração Stripe Configurada com Produtos Reais

O sistema está totalmente integrado com seus produtos reais da Stripe.

### 📋 Planos Ativos:
- **Plano Mensal**: R$ 149,99/mês
- **Plano Trimestral**: R$ 389,90/trimestre (Popular)
- **Plano Anual**: R$ 1.296,00/ano

### 🔑 Price IDs Configurados:
- **Plano Mensal**: `price_1S3bgGB4if3rE1yXE7zVojFW`
- **Plano Trimestral**: `price_1S3blbB4if3rE1yX2UvDOZyI`
- **Plano Anual**: `price_1RucR4B4if3rE1yXEFat9ZXL`

### 🔐 Webhook Configurado:
- **URL**: `https://mgmfxynlgghkuikqqrka.supabase.co/functions/v1/stripe-webhook`
- **Eventos**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

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

## 🔧 Produtos Configurados

### Plano Mensal (R$ 149,99/mês)
- **Price ID**: `price_1S3bgGB4if3rE1yXE7zVojFW`
- **Descrição**: Todas as funcionalidades, Suporte técnico, incluído Atualizações automáticas e Backup automático
- **Duração**: 1 mês
- **Modo**: Assinatura

### Plano Trimestral (R$ 389,90/trimestre) - POPULAR
- **Price ID**: `price_1S3blbB4if3rE1yX2UvDOZyI`
- **Descrição**: Acesso completo por 3 meses. Todas as funcionalidades incluídas. Controle de mesas, comandas e PDV integrado
- **Duração**: 3 meses
- **Modo**: Assinatura
- **Economia**: vs mensal

### Plano Anual (R$ 1.296,00/ano)
- **Price ID**: `price_1RucR4B4if3rE1yXEFat9ZXL`
- **Descrição**: Todas as funcionalidades, Suporte prioritário, Relatórios avançados e Consultoria gratuita
- **Duração**: 12 meses
- **Modo**: Assinatura
- **Economia**: 28% vs mensal

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

## 💰 Preços e Economia

- **Mensal**: R$ 149,99/mês
- **Trimestral**: R$ 389,90 (equivale a R$ 129,97/mês - economia de 13%)
- **Anual**: R$ 1.296,00 (equivale a R$ 108,00/mês - economia de 28%)

## 🔐 Segurança

- Pagamentos processados 100% pelo Stripe
- Dados criptografados e seguros
- Webhook com assinatura verificada
- Controle de acesso automático
- Backup automático dos dados