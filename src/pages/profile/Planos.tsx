import React, { useState, useEffect } from 'react';
import { Check, CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { stripeProducts, getProductByPriceId } from '../../stripe-config';
import StripeService, { SubscriptionData } from '../../services/StripeService';
import toast from 'react-hot-toast';

const Planos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionData | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const subscription = await StripeService.getUserSubscription();
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast.error('Erro ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    try {
      setCheckoutLoading(priceId);
      
      const product = getProductByPriceId(priceId);
      if (!product) {
        throw new Error('Produto não encontrado');
      }

      const { url } = await StripeService.createCheckoutSession({
        priceId,
        mode: product.mode,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar assinatura');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getCurrentPlan = () => {
    if (!currentSubscription?.price_id) return null;
    return getProductByPriceId(currentSubscription.price_id);
  };

  const isCurrentPlan = (priceId: string) => {
    return currentSubscription?.price_id === priceId && 
           ['active', 'trialing'].includes(currentSubscription.subscription_status);
  };

  const getSubscriptionStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Ativa',
      'trialing': 'Período de teste',
      'past_due': 'Pagamento em atraso',
      'canceled': 'Cancelada',
      'incomplete': 'Incompleta',
      'unpaid': 'Não paga',
      'paused': 'Pausada'
    };
    return statusMap[status] || status;
  };

  // Group products by billing cycle
  const monthlyPlans = stripeProducts.filter(p => 
    !p.name.toLowerCase().includes('anual')
  );
  
  const yearlyPlans = stripeProducts.filter(p => 
    p.name.toLowerCase().includes('anual')
  );

  const currentPlans = billingCycle === 'monthly' ? monthlyPlans : yearlyPlans;

  // Define prices for each plan
  const planPrices: Record<string, { monthly: number; yearly: number }> = {
    'Starter': { monthly: 40.00, yearly: 430.80 },
    'Básico': { monthly: 60.90, yearly: 599.88 },
    'Profissional': { monthly: 85.90, yearly: 790.80 }
  };

  const calculateYearlySavings = (planName: string) => {
    const baseName = planName.replace(' Anual', '');
    const prices = planPrices[baseName];
    if (!prices) return 0;
    
    const monthlyTotal = prices.monthly * 12;
    return monthlyTotal - prices.yearly;
  };

  const getPlanPrice = (product: any) => {
    const baseName = product.name.replace(' Anual', '');
    const prices = planPrices[baseName];
    
    if (!prices) return 0;
    
    return product.name.includes('Anual') ? prices.yearly : prices.monthly;
  };

  const getPlanFeatures = (planName: string) => {
    const baseName = planName.replace(' Anual', '');
    
    const features: Record<string, string[]> = {
      'Starter': [
        'Sistema de PDV completo',
        'Controle de estoque',
        'Dashboard e relatórios',
        'Exportação de dados (PDF e Excel)',
        'Relatórios avançados de vendas',
        'Suporte padrão',
        'Teste grátis de 7 dias'
      ],
      'Básico': [
        'Acesso completo às comandas e mesas',
        'Gerenciamento para garçons e cozinha',
        'Controle de estoque',
        'Acesso ao dashboard',
        'Relatórios avançados de vendas',
        'Exportação de dados (PDF e Excel)',
        'Suporte padrão',
        'Teste grátis de 7 dias'
      ],
      'Profissional': [
        'Todas as funcionalidades do plano Básico',
        'Sistema de PDV completo',
        'Integração com ifood',
        'Controle de estoque avançado',
        'Relatórios detalhados',
        'Exportação de dados (PDF e Excel)',
        'Relatórios avançados de vendas',
        'Suporte prioritário',
        'Teste grátis de 7 dias'
      ]
    };

    return features[baseName] || [];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Current Subscription Alert */}
      {currentSubscription && currentSubscription.subscription_status !== 'not_started' && (
        <div className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Assinatura Atual
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Plano {getCurrentPlan()?.name || 'Desconhecido'} - {getSubscriptionStatusText(currentSubscription.subscription_status)}
                  {currentSubscription.cancel_at_period_end && ' (Cancelamento agendado)'}
                </p>
                {currentSubscription.current_period_end && (
                  <p className="mt-1">
                    Próxima cobrança em {new Date(currentSubscription.current_period_end * 1000).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Mensal
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setBillingCycle('yearly')}
          >
            Anual
            <span className="ml-1 text-green-500 text-xs">
              Economize até {formatPrice(calculateYearlySavings('Profissional'))}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {currentPlans.map((product, index) => {
          const price = getPlanPrice(product);
          const features = getPlanFeatures(product.name);
          const isPopular = product.name.includes('Profissional');
          const isCurrent = isCurrentPlan(product.priceId);
          const isLoading = checkoutLoading === product.priceId;

          return (
            <div
              key={product.id}
              className={`relative bg-white rounded-lg shadow-sm overflow-hidden border-2 transition-transform hover:scale-105 ${
                isPopular
                  ? 'border-blue-500 transform scale-105 z-10'
                  : 'border-gray-200'
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-sm font-medium">
                  Melhor escolha
                </div>
              )}

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {product.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {product.description}
                </p>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {formatPrice(price)}
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </p>

                {billingCycle === 'yearly' && (
                  <p className="mt-2 text-sm text-green-600">
                    Economize {formatPrice(calculateYearlySavings(product.name))} ao ano
                  </p>
                )}

                <ul className="mt-6 space-y-4">
                  {features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="ml-3 text-sm text-gray-700">
                        {feature}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    variant={isPopular ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => handleSubscribe(product.priceId)}
                    isLoading={isLoading}
                    disabled={isCurrent || isLoading}
                  >
                    {isCurrent 
                      ? 'Plano Atual' 
                      : isLoading 
                        ? 'Processando...' 
                        : billingCycle === 'yearly' 
                          ? 'Assinar Plano Anual' 
                          : 'Comece agora'
                    }
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Todos os planos incluem teste grátis de 7 dias. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
};

export default Planos;