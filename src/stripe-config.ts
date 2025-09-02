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
    id: 'teste',
    name: 'Teste',
    description: 'teste',
    price: 100, // R$ 1,00 em centavos
    priceId: 'price_1S2w0KB4if3rE1yX3gGCzDaQ',
    interval: 'month',
    mode: 'subscription',
    accessDuration: 12, // 1 ano de acesso
    features: [
      'Acesso completo por 1 ano',
      'Todas as funcionalidades disponíveis',
      'Ideal para testes e desenvolvimento',
      'Suporte básico incluído'
    ]
  },
  {
    id: 'plano-mensal',
    name: 'Plano Mensal',
    description: 'Todas as funcionalidades, Suporte técnico, incluído Atualizações automáticas e Backup automático',
    price: 12000, // R$ 120,00 em centavos
    priceId: 'price_1RucPuB4if3rE1yXh76pGzs7',
    interval: 'month',
    mode: 'subscription',
    accessDuration: 1, // 1 mês de acesso
    features: [
      'Controle completo de mesas e comandas',
      'PDV integrado com múltiplas formas de pagamento',
      'Gestão de estoque e insumos',
      'Cardápio digital com QR Code',
      'Relatórios de vendas em tempo real',
      'Sistema de funcionários com permissões',
      'Suporte técnico via WhatsApp',
      'Atualizações automáticas',
      'Backup automático dos dados'
    ]
  },
  {
    id: 'plano-trimestral',
    name: 'Plano Trimestral',
    description: '',
    price: 36000, // R$ 360,00 em centavos
    priceId: 'price_1RvfteB4if3rE1yXvpuv438F',
    interval: 'quarter',
    mode: 'subscription',
    popular: true,
    accessDuration: 3, // 3 meses de acesso
    features: [
      'Todas as funcionalidades do Plano Mensal',
      'Suporte prioritário',
      'Consultoria de implementação',
      'Treinamento da equipe incluído',
      'Backup automático dos dados',
      'Relatórios avançados de CMV',
      'Melhor custo-benefício'
    ]
  },
  {
    id: 'plano-anual',
    name: 'Plano Anual',
    description: 'Todas as funcionalidades, Suporte prioritário, Relatórios avançados e Consultoria gratuita',
    price: 129600, // R$ 1.296,00 em centavos
    priceId: 'price_1RucR4B4if3rE1yXEFat9ZXL',
    interval: 'year',
    mode: 'subscription',
    accessDuration: 12, // 12 meses de acesso
    discount: {
      savings: 14400, // R$ 144,00 de economia (12 * 120 - 1296)
      percentage: 10
    },
    features: [
      'Todas as funcionalidades dos outros planos',
      'Economia de 10% no valor anual',
      'Suporte VIP 24/7',
      'Consultoria mensal incluída',
      'Customizações exclusivas',
      'Integração com sistemas externos',
      'Relatórios personalizados',
      'Consultoria gratuita'
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
  return activeStatuses.includes(subscription.subscription_status);
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

  switch (subscription.subscription_status) {
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
        status: subscription.subscription_status,
        statusText: 'Status Desconhecido'
      };
  }
};