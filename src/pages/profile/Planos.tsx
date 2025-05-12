import React, { useState, useEffect } from 'react';
import { Check, CreditCard, AlertTriangle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Sistema de Ponto de venda e estoque',
    monthlyPrice: 40.00,
    yearlyPrice: 430.80,
    features: [
      'Sistema de PDV completo',
      'Controle de estoque',
      'Dashboard e relatórios',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte padrão',
      'Teste grátis de 7 dias'
    ]
  },
  {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para começar',
    monthlyPrice: 60.90,
    yearlyPrice: 599.88,
    features: [
      'Acesso completo às comandas e mesas',
      'Gerenciamento para garçons e cozinha',
      'Controle de estoque',
      'Acesso ao dashboard',
      'Relatórios avançados de vendas',
      'Exportação de dados (PDF e Excel)',
      'Suporte padrão',
      'Teste grátis de 7 dias'
    ]
  },
  {
    id: 'pro',
    name: 'Profissional',
    description: 'Mais completo',
    monthlyPrice: 85.90,
    yearlyPrice: 790.80,
    features: [
      'Todas as funcionalidades do plano Básico',
      'Sistema de PDV completo',
      'Integração com ifood',
      'Controle de estoque avançado',
      'Relatórios detalhados',
      'Exportação de dados (PDF e Excel)',
      'Relatórios avançados de vendas',
      'Suporte prioritário',
      'Teste grátis de 7 dias'
    ],
    popular: true
  }
];

const Planos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found - this is okay
          setCurrentSubscription(null);
          return;
        }
        throw error;
      }
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast.error('Erro ao carregar assinatura');
    }
  };

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    try {
      // Implement Stripe checkout session creation here
      toast.success('Redirecionando para o checkout...');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Erro ao processar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const calculateYearlySavings = (plan: Plan) => {
    const monthlyTotal = plan.monthlyPrice * 12;
    return monthlyTotal - plan.yearlyPrice;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Current Subscription Alert */}
      {currentSubscription && (
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
                  Plano {plans.find(p => p.id === currentSubscription.plan_id)?.name}
                  {currentSubscription.cancel_at_period_end && ' (Cancelamento agendado)'}
                </p>
                <p className="mt-1">
                  Próxima cobrança em {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              billingCycle === 'monthly'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Mensal
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              billingCycle === 'yearly'
                ? 'bg-white shadow-sm text-gray-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setBillingCycle('yearly')}
          >
            Anual
            <span className="ml-1 text-green-500 text-xs">
              Economize até {formatPrice(calculateYearlySavings(plans[2]))}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-lg shadow-sm overflow-hidden border-2 ${
              plan.popular
                ? 'border-blue-500 transform scale-105 z-10'
                : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-sm font-medium">
                Melhor escolha
              </div>
            )}

            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {plan.name}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {plan.description}
              </p>
              <p className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">
                  {formatPrice(billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                </span>
                <span className="text-base font-medium text-gray-500">
                  /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                </span>
              </p>

              {billingCycle === 'yearly' && (
                <p className="mt-2 text-sm text-green-600">
                  Economize {formatPrice(calculateYearlySavings(plan))} ao ano
                </p>
              )}

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
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
                  variant={plan.popular ? 'primary' : 'secondary'}
                  fullWidth
                  onClick={() => handleSubscribe(plan.id)}
                  isLoading={loading}
                  disabled={currentSubscription?.plan_id === plan.id && !currentSubscription?.cancel_at_period_end}
                >
                  {billingCycle === 'yearly' ? 'Assinar Plano Anual' : 'Comece agora'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planos;