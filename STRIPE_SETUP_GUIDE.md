# 🔧 Guia de Configuração do Stripe Webhook

## 📍 Onde encontrar o STRIPE_WEBHOOK_SECRET

### 1. Acesse o Stripe Dashboard
- Vá para [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- Faça login com sua conta Stripe

### 2. Criar/Configurar Webhook
Se você ainda não tem um webhook configurado:

1. **Clique em "Add endpoint"**
2. **URL do endpoint**: `https://mgmfxynlgghkuikqqrka.supabase.co/functions/v1/stripe-webhook`
3. **Eventos para escutar**:
   - `checkout.session.completed`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
4. **Clique em "Add endpoint"**

### 3. Obter o Signing Secret
1. **Clique no webhook criado**
2. **Na seção "Signing secret"**, clique em "Reveal"
3. **Copie o valor** (começa com `whsec_`)

### 4. Configurar no Supabase
1. **Acesse**: [https://supabase.com/dashboard/project/mgmfxynlgghkuikqqrka/settings/functions](https://supabase.com/dashboard/project/mgmfxynlgghkuikqqrka/settings/functions)
2. **Vá para "Environment variables"**
3. **Adicione as variáveis**:
   - `STRIPE_SECRET_KEY`: `sk_live_51•••••zEC` (sua chave secreta)
   - `STRIPE_WEBHOOK_SECRET`: `whsec_•••••` (o valor copiado do webhook)

## 🔍 Verificar se já existe

Se você já tem um webhook configurado:
1. Acesse [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Procure por um endpoint com URL similar ao seu projeto Supabase
3. Clique nele e vá para "Signing secret"
4. Copie o valor e configure no Supabase

## ✅ Teste da Configuração

Após configurar, você pode testar:
1. Faça uma compra de teste
2. Verifique os logs do webhook no Stripe Dashboard
3. Confirme se a assinatura foi ativada no seu sistema

## 🚨 Importante

- O webhook é essencial para ativar automaticamente as assinaturas
- Sem ele, os usuários não terão acesso liberado após o pagamento
- Certifique-se de que a URL do webhook está correta
- Use sempre HTTPS para webhooks em produção