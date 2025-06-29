export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SaXe9LDgiUdTTe',
    priceId: 'price_1RfMZJBA36JNlLOk6eNWmlBq',
    name: 'Starter Anual',
    description: 'Sistema Anual de Ponto de venda e estoque',
    mode: 'subscription'
  },
  {
    id: 'prod_SaXdYpeW9gyNZE',
    priceId: 'price_1RfMXsBA36JNlLOkegDT3eC3',
    name: 'Básico Anual',
    description: 'Básico Anual Ideal para começar',
    mode: 'subscription'
  },
  {
    id: 'prod_SaXbZC0Hg29hMb',
    priceId: 'price_1RfMWVBA36JNlLOk9ycRNEDS',
    name: 'Profissional Anual',
    description: 'Profissional Anual Mais completo',
    mode: 'subscription'
  },
  {
    id: 'prod_SaXZHVTbsrfN2F',
    priceId: 'price_1RfMUkBA36JNlLOktlTc97ak',
    name: 'Profissional',
    description: 'Profissional Mais completo',
    mode: 'subscription'
  },
  {
    id: 'prod_SaXYxRTAbyy6I3',
    priceId: 'price_1RfMTMBA36JNlLOk6caSBKbG',
    name: 'Básico',
    description: 'BásicoIdeal para começar',
    mode: 'subscription'
  },
  {
    id: 'prod_SaXVY7srqNsr2z',
    priceId: 'price_1RfMQwBA36JNlLOkMN6yuZ4K',
    name: 'Starter',
    description: 'Starter Sistema de Ponto de venda e estoque',
    mode: 'subscription'
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