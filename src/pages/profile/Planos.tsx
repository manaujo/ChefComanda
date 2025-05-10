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
  price: number;
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

const Planos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Ideal para pequenos estabelecimentos',
      price: billingCycle === 'monthly' ? 99.90 : 999.00,
      features: [
        'Até 5 mesas',
        'Sistema de PDV básico',
        'Controle de comandas',
        'Relatórios básicos',
        'Suporte por email'
      ]
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'Para restaurantes em crescimento',
      price: billingCycle === 'monthly' ? 199.90 : 1999.00,
      features: [
        'Até 15 mesas',
        'Sistema de PDV completo',
        'Controle de estoque',
        'Relatórios avançados',
        'Integração com iFood',
        'Suporte prioritário',
        'Backup diário'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Solução completa para seu negócio',
      price: billingCycle === 'monthly' ? 299.90 : 2999.00,
      features: [
        'Mesas ilimitadas',
        'Todas as funcionalidades Pro',
        'API personalizada',
        'Múltiplas filiais',
        'Suporte 24/7',
        'Treinamento personalizado',
        'Backup em tempo real'
      ]
    }
  ];

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

      if (error) throw error;
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

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', currentSubscription?.id);

      if (error) throw error;

      setCurrentSubscription(prev => prev ? {
        ...prev,
        cancel_at_period_end: true
      } : null);

      toast.success('Assinatura cancelada com sucesso');
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setLoading(false);
    }
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
              Economize 20%
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
                Popular
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
                  R$ {plan.price.toFixed(2)}
                </span>
                <span className="text-base font-medium text-gray-500">
                  /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                </span>
              </p>

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
                  {currentSubscription?.plan_id === plan.id
                    ? currentSubscription?.cancel_at_period_end
                      ? 'Reativar Assinatura'
                      : 'Plano Atual'
                    : 'Assinar Agora'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      Cancelar Assinatura
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja cancelar sua assinatura? Você continuará tendo acesso até o final do período atual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="danger"
                  onClick={handleCancelSubscription}
                  isLoading={loading}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  Cancelar Assinatura
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelModal(false)}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planos;