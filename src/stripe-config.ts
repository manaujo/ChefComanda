export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  features: string[];
  popular?: boolean;
  discount?: {
    percentage: number;
    savings: number;
  };
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SqJ1y8cdRNf9e6',
    priceId: 'price_1RucPuB4if3rE1yXh76pGzs7',
    name: 'Plano Mensal',
    description: 'Todas as funcionalidades, Suporte técnico, incluído Atualizações automáticas e Backup automático',
    mode: 'subscription',
    price: 120.00,
    currency: 'BRL',
    interval: 'month',
    features: [
      'Todas as funcionalidades',
      'Suporte técnico incluído',
      'Atualizações automáticas',
      'Backup automático'
    ],
    popular: false
  },
  {
    id: 'prod_SrOhihHqyujWP0',
    priceId: 'price_1RvfteB4if3rE1yXvpuv438F',
    name: 'Plano Trimestral',
    description: 'Flexibilidade com economia trimestral',
    mode: 'subscription',
    price: 360.00,
    currency: 'BRL',
    interval: 'month', // Stripe handles quarterly as 3-month intervals
    features: [
      'Todas as funcionalidades',
      'Suporte técnico incluído',
      'Atualizações automáticas',
      'Backup automático',
      'Economia trimestral'
    ],
    popular: true
  },
  {
    id: 'prod_SqJ322JET3gPo4',
    priceId: 'price_1RucR4B4if3rE1yXEFat9ZXL',
    name: 'Plano Anual',
    description: 'Todas as funcionalidades, Suporte prioritário, Relatórios avançados e Consultoria gratuita',
    mode: 'subscription',
    price: 1296.00,
    currency: 'BRL',
    interval: 'year',
    features: [
      'Todas as funcionalidades',
      'Suporte prioritário',
      'Relatórios avançados',
      'Consultoria gratuita'
    ],
    popular: false,
    discount: {
      percentage: 10,
      savings: 144
    }
  }
];

// Helper function to get product by price ID
export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

// Helper function to get product by product ID
export function getProductById(productId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === productId);
}

// Helper function to calculate monthly equivalent for quarterly/annual plans
export function getMonthlyEquivalent(product: StripeProduct): number {
  if (product.interval === 'year') {
    return product.price / 12;
  }
  // For quarterly (trimestral), divide by 3
  if (product.name.includes('Trimestral')) {
    return product.price / 3;
  }
  return product.price;
}

// Helper function to format price
export function formatPrice(amount: number, currency: string = 'BRL'): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency
  });
}