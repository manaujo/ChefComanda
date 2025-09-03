export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  interval: 'month' | 'year' | 'quarter';
  mode: 'payment' | 'subscription';
  features: string[];
  popular?: boolean;
  discount?: {
    savings: number;
    percentage: number;
  };
  accessDuration: number; // em meses
}

// Configuração com seus Price IDs reais da Stripe
export const stripeProducts: StripeProduct[] = [
  {
    id: 'teste',
    name: 'Teste',
    description: 'Plano de teste por apenas R$ 1,00 por ano',
    price: 100, // R$ 1,00 em centavos
    priceId: 'price_1S2w0KB4if3rE1yX3gGCzDaQ', // Price ID correto fornecido
    interval: 'year',
    mode: 'subscription',
    accessDuration: 12,
    features: [
      'Acesso completo por 1 ano',
      'Todas as funcionalidades incluídas',
      'Controle de mesas e comandas',
      'PDV integrado',
      'Gestão de estoque',
      'Relatórios avançados',
      'Cardápio digital com QR Code',
      'Suporte técnico',
      'Plano de teste por R$ 1,00'
    ]
  },
  {
    id: 'mensal',
    name: 'Plano Mensal',
    description: 'Acesso completo mensal com todas as funcionalidades',
    price: 12000, // R$ 120,00 em centavos
    priceId: 'price_1RucPuB4if3rE1yXh76pGzs7', // Seu Price ID real
    interval: 'month',
    mode: 'subscription',
    accessDuration: 1,
    features: [
      'Acesso completo por 1 mês',
      'Todas as funcionalidades incluídas',
      'Controle de mesas e comandas',
      'PDV integrado',
      'Gestão de estoque',
      'Relatórios avançados',
      'Cardápio digital com QR Code',
      'Suporte técnico',
      'Flexibilidade mensal'
    ]
  },
  {
    id: 'trimestral',
    name: 'Plano Trimestral',
    description: 'Acesso completo trimestral com economia',
    price: 36000, // R$ 360,00 em centavos
    priceId: 'price_1RvfteB4if3rE1yXvpuv438F', // Seu Price ID real
    interval: 'quarter',
    mode: 'subscription',
    popular: true,
    accessDuration: 3,
    features: [
      'Acesso completo por 3 meses',
      'Todas as funcionalidades incluídas',
      'Controle de mesas e comandas',
      'PDV integrado',
      'Gestão de estoque',
      'Relatórios avançados',
      'Cardápio digital com QR Code',
      'Suporte técnico',
      'Economia no pagamento trimestral'
    ]
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    description: 'Acesso completo anual com máxima economia',
    price: 129600, // R$ 1.296,00 em centavos
    priceId: 'price_1RucR4B4if3rE1yXEFat9ZXL', // Seu Price ID real
    interval: 'year',
    mode: 'subscription',
    accessDuration: 12,
    discount: {
      savings: 14400, // Economia de R$ 144,00 comparado ao mensal (12 * 120 - 1296)
      percentage: 10
    },
    features: [
      'Acesso completo por 1 ano',
      'Todas as funcionalidades incluídas',
      'Controle de mesas e comandas',
      'PDV integrado',
      'Gestão de estoque',
      'Relatórios avançados',
      'Cardápio digital com QR Code',
      'Suporte técnico',
      'Máxima economia anual',
      'Economia de 10% vs mensal'
    ]
  }
];

export const formatPrice = (priceInCents: number): string => {
  return (priceInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getMonthlyEquivalent = (product: StripeProduct): number => {
  if (product.interval === 'year') {
    return Math.round(product.price / 12);
  }
  if (product.interval === 'quarter') {
    return Math.round(product.price / 3);
  }
  return product.price;
};

export const hasActiveSubscription = (subscription: any): boolean => {
  if (!subscription) return false;
  
  const activeStatuses = ['active', 'trialing'];
  const status = subscription.subscription_status || subscription.status;
  
  // Verificar se não está cancelado e está dentro do período
  if (subscription.cancel_at_period_end && subscription.current_period_end) {
    const now = Math.floor(Date.now() / 1000);
    return activeStatuses.includes(status) && now < subscription.current_period_end;
  }
  
  return activeStatuses.includes(status);
};

export const isSubscriptionExpired = (subscription: any): boolean => {
  if (!subscription || !subscription.current_period_end) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return now > subscription.current_period_end;
};

export const canUpgradeSubscription = (currentSubscription: any, targetProduct: StripeProduct): boolean => {
  if (!currentSubscription) return true;
  
  const currentProduct = getProductByPriceId(currentSubscription.price_id);
  if (!currentProduct) return true;
  
  // Allow upgrade if target product has higher price or longer duration
  return targetProduct.price > currentProduct.price || 
         targetProduct.accessDuration > currentProduct.accessDuration;
};

export const getSubscriptionStatus = (subscription: any): {
  isActive: boolean;
  status: string;
  statusText: string;
  daysRemaining?: number;
} => {
  if (!subscription) {
    return {
      isActive: false,
      status: 'none',
      statusText: 'Nenhuma assinatura'
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const daysRemaining = subscription.current_period_end 
    ? Math.ceil((subscription.current_period_end - now) / (24 * 60 * 60))
    : 0;

  const status = subscription.subscription_status || subscription.status;
  
  switch (status) {
    case 'active':
      return {
        isActive: true,
        status: 'active',
        statusText: 'Ativo',
        daysRemaining
      };
    case 'trialing':
      return {
        isActive: true,
        status: 'trialing',
        statusText: 'Período de Teste',
        daysRemaining
      };
    case 'past_due':
      return {
        isActive: false,
        status: 'past_due',
        statusText: 'Pagamento Pendente',
        daysRemaining
      };
    case 'canceled':
      return {
        isActive: false,
        status: 'canceled',
        statusText: 'Cancelado'
      };
    default:
      return {
        isActive: false,
        status: status,
        statusText: 'Status Desconhecido'
      };
  }
};

// Função para verificar se todos os planos dão o mesmo acesso
export const hasFullAccess = (subscription: any): boolean => {
  // Todos os planos (exceto quando não há assinatura) dão acesso completo
  return hasActiveSubscription(subscription);
};

// Função para obter o nome do plano baseado no Price ID
export const getPlanNameByPriceId = (priceId: string): string => {
  const product = getProductByPriceId(priceId);
  return product?.name || 'Plano Desconhecido';
};

// Função para verificar se é plano de teste
export const isTestPlan = (priceId: string): boolean => {
  return priceId === 'price_1SzW0KB4if3rE1yX3gGCzDaQ';
};

// Função para calcular economia anual
export const getAnnualSavings = (monthlyPrice: number): number => {
  const annualEquivalent = monthlyPrice * 12;
  const annualPrice = 129600; // R$ 1.296,00 em centavos
  return annualEquivalent - annualPrice;
};