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
    id: 'prod_monthly_plan',
    priceId: 'price_monthly_120', // Replace with your actual Stripe price ID
    name: 'Plano Mensal',
    description: 'Flexibilidade total',
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
    id: 'prod_annual_plan',
    priceId: 'price_annual_1296', // Replace with your actual Stripe price ID
    name: 'Plano Anual',
    description: 'Melhor custo-benefício',
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
    popular: true,
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

// Helper function to calculate monthly equivalent for annual plans
export function getMonthlyEquivalent(product: StripeProduct): number {
  if (product.interval === 'year') {
    return product.price / 12;
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