import React from 'react';
import { CreditCard, Check, Star } from 'lucide-react';

const Planos: React.FC = () => {
  const plans = [
    {
      name: 'Básico',
      price: 'R$ 99',
      period: '/mês',
      features: [
        'Até 5 mesas',
        'Cardápio digital',
        'Relatórios básicos',
        'Suporte por email'
      ],
      popular: false
    },
    {
      name: 'Profissional',
      price: 'R$ 199',
      period: '/mês',
      features: [
        'Até 20 mesas',
        'Cardápio digital avançado',
        'Relatórios completos',
        'Integração com delivery',
        'Suporte prioritário'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'R$ 399',
      period: '/mês',
      features: [
        'Mesas ilimitadas',
        'Múltiplos estabelecimentos',
        'API personalizada',
        'Relatórios avançados',
        'Suporte 24/7'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Escolha o plano ideal para seu restaurante
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Planos flexíveis que crescem com seu negócio
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-indigo-500 shadow-lg'
                  : 'border-gray-200'
              } bg-white p-8 shadow-sm`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-indigo-500 text-white">
                    <Star className="w-4 h-4 mr-1" />
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="ml-1 text-xl font-semibold text-gray-500">
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5" />
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <button
                  className={`w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md text-base font-medium ${
                    plan.popular
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                  } transition-colors duration-200`}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Escolher Plano
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Todos os planos incluem 30 dias de teste grátis
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planos;