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

export const stripeProducts: StripeProduct[] = [
  {
    id: 'basico',
    name: 'Básico',
    description: 'Acesso completo às comandas e mesas, gerenciamento para garçons e cozinha, controle de estoque, acesso ao dashboard, relatórios avançados de vendas, exportação de dados (PDF e Excel), suporte padrão, cancelamento a qualquer momento, teste grátis de 7 dias',
    price: 6090, // R$ 60,90 em centavos
    priceId: 'price_1RMZAmB4if3rE1yX5xRa4ZnU',
    interval: 'month',
    mode: 'subscription',
    accessDuration: 1, // 1 mês de acesso
    features: [
      'Acesso completo às comandas e mesas',
      'Gerenciamento para garçons e cozinha',
      'Controle de estoque',
      'Acesso ao dashboard',
      'Relatórios avançados de vendas',
      'Exportação de dados (PDF e Excel)',
      'Suporte padrão',
      'Cancelamento a qualquer momento',
      'Teste grátis de 7 dias'
    ]
  },
  {
    id: 'starter-anual',
    name: 'Starter Anual',
    description: 'Sistema de PDV completo, controle de estoque, dashboard e relatórios, exportação de dados (PDF e Excel), relatórios avançados de vendas, suporte padrão, teste grátis de 7 dias',
    price: 43080, // R$ 430,80 em centavos
    priceId: 'price_1RMZ8oB4if3rE1yXA0fqPRvf',
    interval: 'year',
    mode: 'subscription',
    accessDuration: 12, // 12 meses de acesso
    discount: {
      savings: 30000, // Economia comparado ao plano mensal (12 * 60.90 - 430.80)
      percentage: 41
    },
    features: [
      'Sistema de PDV completo',
      'Controle de estoque',
      'Dashboard e relatórios',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte padrão',
      'Teste grátis de 7 dias',
      'Economia de 41% no valor anual'
    ]
  },
  {
    id: 'basico-anual',
    name: 'Básico Anual',
    description: 'Acesso completo às comandas e mesas, gerenciamento para garçons e cozinha, controle de estoque, acesso ao dashboard, relatórios avançados de vendas, exportação de dados (PDF e Excel), suporte padrão, teste grátis de 7 dias',
    price: 59988, // R$ 599,88 em centavos
    priceId: 'price_1RMZ7bB4if3rE1yXb6F4Jj0u',
    interval: 'year',
    mode: 'subscription',
    popular: true,
    accessDuration: 12, // 12 meses de acesso
    discount: {
      savings: 31092, // Economia comparado ao plano mensal (12 * 60.90 - 599.88)
      percentage: 18
    },
    features: [
      'Acesso completo às comandas e mesas',
      'Gerenciamento para garçons e cozinha',
      'Controle de estoque',
      'Acesso ao dashboard',
      'Relatórios avançados de vendas',
      'Exportação de dados (PDF e Excel)',
      'Suporte padrão',
      'Cancelamento a qualquer momento',
      'Teste grátis de 7 dias',
      'Economia de 18% no valor anual'
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