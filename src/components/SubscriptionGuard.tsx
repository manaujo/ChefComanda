import React, { useState, useEffect } from 'react';
import { Crown, Lock, CreditCard, AlertTriangle, ArrowRight, Zap, Star, Shield, CheckCircle, Calendar, Award, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import StripeService from '../services/StripeService';
import { stripeProducts, hasActiveSubscription, formatPrice, getMonthlyEquivalent, getSubscriptionStatus } from '../stripe-config';
import StripeCheckout from './StripeCheckout';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredFeature?: string;
  fallbackMessage?: string;
  allowDashboard?: boolean;
  requireActiveSubscription?: boolean;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  requiredFeature,
  fallbackMessage,
  allowDashboard = false,
  requireActiveSubscription = true
}) => {
  const { user, currentPlan } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [effectiveSubscription, setEffectiveSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionAndInheritance();
    }
  }, [user]);

  const loadSubscriptionAndInheritance = async () => {
    try {
      // Load regular subscription
      const subscriptionData = await StripeService.getUserSubscription();
      setSubscription(subscriptionData);
      
      // The subscription data already includes inheritance info
      setEffectiveSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando assinatura...</p>
        </div>
      </div>
    );
  };

  // Use effective subscription if available (for employees), otherwise use regular subscription
  const activeSubscription = effectiveSubscription || subscription;
  const subscriptionStatus = getSubscriptionStatus(activeSubscription);

  // Se não requer assinatura ativa (Dashboard e Profile), permitir acesso
  if (!requireActiveSubscription) {
    return <>{children}</>;
  }

  // Se tem plano ativo (próprio ou herdado), permitir acesso
  if (subscriptionStatus.isActive || (effectiveSubscription && effectiveSubscription.is_active)) {
    return <>{children}</>;
  }

  // Se é funcionário com plano herdado ativo, mostrar interface especial
  if (effectiveSubscription?.is_inherited && effectiveSubscription?.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="p-6 bg-white/20 backdrop-blur-sm rounded-3xl">
                    <CheckCircle size={48} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                    <Crown size={16} className="text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Acesso Herdado Ativo
              </h1>
              <p className="text-xl text-green-100 mb-6">
                Você tem acesso completo ao ChefComanda através do plano ativo da conta principal
              </p>
            </div>
            
            <div className="p-8">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-2xl mr-4">
                      <Crown className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                        Plano Ativo: {effectiveSubscription.plan_name || 'Plano Ativo'}
                      </h3>
                      <p className="text-green-600 dark:text-green-400">
                        Administrador: {effectiveSubscription.owner_name || 'Conta Principal'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-bold">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acesso Completo
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Todas as Funcionalidades</p>
                  </div>
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <Zap className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Acesso em Tempo Real</p>
                  </div>
                  <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                    <Crown className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Plano Compartilhado</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  icon={<ArrowRight size={20} />}
                >
                  Acessar Sistema
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Caso contrário, mostrar tela de upgrade
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="p-6 bg-white/20 backdrop-blur-sm rounded-3xl">
                  <Crown size={48} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <Star size={16} className="text-red-800" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Plano Necessário
            </h1>
            <p className="text-xl text-red-100 mb-6">
              {fallbackMessage || 'Você precisa de um plano ativo para acessar esta funcionalidade do ChefComanda'}
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-yellow-300 mr-2" />
              <span className="text-white font-semibold">
                {subscriptionStatus.statusText}
                {subscriptionStatus.daysRemaining && subscriptionStatus.daysRemaining > 0 && (
                  <span className="ml-2">
                    ({subscriptionStatus.daysRemaining} dias restantes)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Plans */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Escolha seu Plano ChefComanda
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                Assine agora e tenha acesso completo ao sistema de gestão mais completo para restaurantes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                  <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Seguro</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Pagamentos protegidos pelo Stripe</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Acesso Completo</h4>
                  <p className="text-sm text-green-600 dark:text-green-300">Todas as funcionalidades incluídas</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                  <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200">Sem Compromisso</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-300">Cancele quando quiser</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {stripeProducts.map((product, index) => (
                <div 
                  key={product.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                    product.popular 
                      ? 'border-2 border-yellow-400 ring-4 ring-yellow-100 dark:ring-yellow-900/30' 
                      : 'border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {product.popular && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 text-center font-bold text-sm">
                      <div className="flex items-center justify-center">
                        <Gift className="w-4 h-4 mr-2" />
                        MAIS ESCOLHIDO
                      </div>
                    </div>
                  )}
                  
                  <div className={`px-6 py-6 ${
                    product.id === 'teste' ? 'bg-gradient-to-r from-green-600 to-green-700' :
                    product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                    product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                    product.id === 'anual' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    <div className="text-center">
                      <div className="p-3 bg-white/20 rounded-full w-fit mx-auto mb-4">
                        {product.id === 'teste' ? <Gift className="w-6 h-6 text-white" /> :
                         product.id === 'mensal' ? <Calendar className="w-6 h-6 text-white" /> :
                         product.id === 'trimestral' ? <Star className="w-6 h-6 text-white" /> :
                         product.id === 'anual' ? <Award className="w-6 h-6 text-white" /> :
                         <Zap className="w-6 h-6 text-white" />}
                      </div>
                      <h3 className="text-xl font-bold text-white">{product.name}</h3>
                      <p className={`mt-2 text-sm ${
                        product.id === 'teste' ? 'text-green-100' :
                        product.id === 'mensal' ? 'text-blue-100' :
                        product.id === 'trimestral' ? 'text-purple-100' :
                        product.id === 'anual' ? 'text-orange-100' :
                        'text-green-100'
                      }`}>
                        {product.description || 'Acesso completo ao sistema'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {formatPrice(product.price)}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          /{product.interval === 'year' ? 'ano' : 
                            product.interval === 'quarter' ? 'trimestre' : 'mês'}
                        </span>
                      </div>
                      {product.interval === 'year' && product.id !== 'teste' && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Equivalente a {formatPrice(getMonthlyEquivalent(product))}/mês
                        </p>
                      )}
                      {product.discount && (
                        <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs font-medium">
                          Economia de {formatPrice(product.discount.savings)}
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-2 mb-6 text-sm">
                      {product.features.slice(0, 4).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-2">
                            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <StripeCheckout
                      product={product}
                      onSuccess={() => {
                        window.location.reload();
                      }}
                      onError={(error) => console.error(error)}
                      className={`w-full font-bold py-3 text-sm ${
                        product.id === 'teste' ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' :
                        product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                        product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                        product.id === 'anual' ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800' :
                        'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-700 hover:to-gray-800'
                      } text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                    >
                      {product.id === 'teste' ? 'Teste por R$ 1' : 'Assinar Agora'}
                    </StripeCheckout>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="text-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Precisa de ajuda para escolher o plano ideal?
              </p>
              <a 
                href="https://wa.me/5562982760471?text=Olá! Preciso de ajuda para escolher o plano ideal do ChefComanda."
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Falar com Vendedor
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                WhatsApp: (62) 98276-0471
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGuard;