import React, { useState, useEffect } from 'react';
import { Check, CreditCard, AlertTriangle, Loader2, Crown, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Planos: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const handleSubscribe = (planType: 'monthly' | 'yearly') => {
    setLoading(true);
    setSelectedPlan(planType);
    
    // Simular processo de checkout
    setTimeout(() => {
      toast.success(`Redirecionando para o checkout do plano ${planType === 'monthly' ? 'mensal' : 'anual'}...`);
      setLoading(false);
      setSelectedPlan(null);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Planos ChefComanda
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Escolha o plano ideal para o seu negócio e transforme a gestão do seu restaurante
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Plano Mensal */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Plano Mensal</h3>
                <p className="text-blue-100 mt-2">Flexibilidade total</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                R$ 120
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mês</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Faturamento mensal</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Todas as funcionalidades</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Suporte técnico incluído</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Atualizações automáticas</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Backup automático</span>
              </li>
            </ul>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => handleSubscribe('monthly')}
              isLoading={loading && selectedPlan === 'monthly'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 text-lg"
            >
              Começar Agora
            </Button>
          </div>
        </div>

        {/* Plano Anual */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-400 hover:shadow-2xl transition-all duration-300 relative">
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-bl-lg font-semibold text-sm flex items-center">
            <Star className="w-4 h-4 mr-1" />
            10% OFF
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Plano Anual</h3>
                <p className="text-yellow-100 mt-2">Melhor custo-benefício</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                R$ 1.296
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">/ano</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Equivalente a R$ 108/mês</p>
              <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium mt-2">
                Economia de R$ 144/ano
              </div>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Todas as funcionalidades</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Suporte prioritário</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Relatórios avançados</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Consultoria gratuita</span>
              </li>
            </ul>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => handleSubscribe('yearly')}
              isLoading={loading && selectedPlan === 'yearly'}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 text-lg"
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </div>

      {/* Recursos Inclusos */}
      <div className="mt-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Recursos Inclusos em Todos os Planos
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Acesso completo a todas as funcionalidades do ChefComanda
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Sistema PDV Completo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ponto de venda integrado com múltiplas formas de pagamento</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Controle de Comandas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestão completa de mesas e pedidos em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Controle de Estoque</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestão de insumos com alertas automáticos</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Relatórios Detalhados</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dashboard e relatórios de vendas em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Cardápio Online</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">QR Code para pedidos diretos dos clientes</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Suporte Especializado</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Equipe técnica dedicada para ajudar seu negócio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Garantia */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-6 py-3 rounded-full">
          <Check className="w-5 h-5" />
          <span className="font-medium">Teste grátis de 7 dias • Cancele a qualquer momento</span>
        </div>
      </div>
    </div>
  );
};

export default Planos;