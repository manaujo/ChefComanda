import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, Star, Crown, AlertTriangle, ExternalLink, 
  Loader2, Calendar, DollarSign, Shield, Headphones, TrendingUp,
  Gift, Clock, Award, X, RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';
import StripeCheckout from '../../components/StripeCheckout';
import { stripeProducts, getProductByPriceId, formatPrice, getMonthlyEquivalent } from '../../stripe-config';
import StripeService from '../../services/StripeService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SubscriptionData {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

const Planos: React.FC = () => {
  const { user, currentPlan, refreshSubscription } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
      loadOrderHistory();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      const subscriptionData = await StripeService.getUserSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast.error('Erro ao carregar dados da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderHistory = async () => {
    try {
      const orderData = await StripeService.getUserOrders();
      setOrders(orderData);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      
      // Call edge function to cancel subscription
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subscription_id: subscription?.subscription_id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar assinatura');
      }

      toast.success('Assinatura cancelada com sucesso. Você terá acesso até o final do período pago.');
      await loadSubscriptionData();
      await refreshSubscription();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar assinatura');
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'past_due':
        return 'Pagamento Pendente';
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  // Função declarada apenas uma vez
  function isCurrentPlan(product: any): boolean {
    return subscription?.price_id === product.priceId;
  }

  const currentProduct = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Planos ChefComanda
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Escolha o plano ideal para o seu negócio e transforme a gestão do seu restaurante
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                  <Crown size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Minha Assinatura</h3>
                  <p className="text-blue-100">Gerencie seu plano ativo</p>
                </div>
              </div>
              <Button
                variant="ghost"
                icon={<RefreshCw size={18} />}
                onClick={loadSubscriptionData}
                className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              >
                Atualizar
              </Button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Detalhes do Plano</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentProduct?.name || 'Plano Ativo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.subscription_status)}`}>
                      {getStatusText(subscription.subscription_status)}
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Próxima cobrança:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  )}
                  {subscription.cancel_at_period_end && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle size={16} className="mr-2" />
                        <span className="text-sm font-medium">
                          Cancelamento agendado para {formatDate(subscription.current_period_end!)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Ações</h4>
                <div className="space-y-3">
                  {!subscription.cancel_at_period_end && subscription.subscription_status === 'active' && (
                    <Button
                      variant="warning"
                      fullWidth
                      onClick={() => setShowCancelModal(true)}
                      icon={<X size={18} />}
                    >
                      Cancelar Assinatura
                    </Button>
                  )}
                  
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setShowUpgradeModal(true)}
                    icon={<TrendingUp size={18} />}
                  >
                    Alterar Plano
                  </Button>
                  
                  <div className="text-center">
                    <a
                      href="https://wa.me/5562982760471?text=Olá! Preciso de ajuda com minha assinatura do ChefComanda."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Precisa de ajuda? Fale conosco
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6">
                <div className="flex justify-between items-center text-white">
                  <div>
                    <h3 className="text-2xl font-bold">Alterar Plano</h3>
                    <p className="text-purple-100">Escolha um novo plano para sua conta</p>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {stripeProducts.map((product, index) => (
                    <div 
                      key={product.id}
                      className={`bg-white dark:bg-gray-700 rounded-2xl shadow-lg overflow-hidden border transition-all duration-300 ${
                        isCurrentPlan(product)
                          ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border border-gray-200 dark:border-gray-600 hover:shadow-xl'
                      }`}
                    >
                      <div className={`px-6 py-4 ${
                        index === 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                        index === 1 ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                        'bg-gradient-to-r from-green-500 to-green-600'
                      }`}>
                        <div className="text-center text-white">
                          <h4 className="text-lg font-bold">{product.name}</h4>
                          <p className="text-sm opacity-90">{product.description}</p>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="text-center mb-4">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(product.price)}
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                              /{product.interval === 'year' ? 'ano' : 
                                product.name.includes('Trimestral') ? 'trimestre' : 'mês'}
                            </span>
                          </div>
                        </div>
                        
                        {isCurrentPlan(product) ? (
                          <Button 
                            variant="ghost" 
                            fullWidth 
                            disabled
                            className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                          >
                            Plano Atual
                          </Button>
                        ) : (
                          <StripeCheckout
                            product={product}
                            onSuccess={() => {
                              toast.success('Redirecionando para alterar plano...');
                              loadSubscriptionData();
                              setShowUpgradeModal(false);
                            }}
                            onError={(error) => toast.error(error)}
                            className="w-full font-semibold py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl"
                          >
                            Alterar para Este Plano
                          </StripeCheckout>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md mx-auto">
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mr-4">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Cancelar Assinatura</h3>
                      <p className="text-red-100">Esta ação não pode ser desfeita</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                    Tem certeza que deseja cancelar?
                  </h4>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span>Você manterá acesso até {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'o final do período'}</span>
                    </div>
                    <div className="flex items-center">
                      <X className="w-4 h-4 text-red-500 mr-2" />
                      <span>Perderá acesso a todas as funcionalidades após o vencimento</span>
                    </div>
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                      <span>Seus dados serão preservados por 30 dias</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium mb-1">Antes de cancelar:</p>
                      <p>Entre em contato conosco pelo WhatsApp (62) 98276-0471. Podemos ajudar com dúvidas ou oferecer soluções personalizadas.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => setShowCancelModal(false)}
                  >
                    Manter Assinatura
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleCancelSubscription}
                    isLoading={canceling}
                    icon={<X size={18} />}
                  >
                    Confirmar Cancelamento
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
        {stripeProducts.map((product, index) => (
          <div 
            key={product.id}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border hover:shadow-2xl transition-all duration-300 relative ${
              product.popular 
                ? 'border-2 border-yellow-400' 
                : 'border border-gray-200 dark:border-gray-700'
            }`}
          >
            {product.popular && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-bl-2xl font-bold text-sm shadow-lg">
                <div className="flex items-center">
                  <Gift className="w-4 h-4 mr-1" />
                  POPULAR
                </div>
              </div>
            )}
            
            <div className={`px-8 py-6 ${
              index === 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
              index === 1 ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
              'bg-gradient-to-r from-yellow-500 to-orange-500'
            }`}>
              <div className="text-center">
                <div className="p-3 bg-white/20 rounded-full w-fit mx-auto mb-4">
                  {index === 0 ? <Calendar className="w-6 h-6 text-white" /> :
                   index === 1 ? <Star className="w-6 h-6 text-white" /> :
                   <Award className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-white">{product.name}</h3>
                <p className={`mt-2 text-sm ${
                  index === 0 ? 'text-blue-100' :
                  index === 1 ? 'text-purple-100' :
                  'text-yellow-100'
                }`}>
                  {product.description}
                </p>
              </div>
            </div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatPrice(product.price)}
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                    /{product.interval === 'year' ? 'ano' : 
                      product.name.includes('Trimestral') ? 'trimestre' : 'mês'}
                  </span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {product.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan(product) ? (
                <Button 
                  variant="ghost" 
                  fullWidth 
                  size="lg"
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  Plano Atual
                </Button>
              ) : (
                <StripeCheckout
                  product={product}
                  onSuccess={() => {
                    toast.success('Redirecionando para o checkout...');
                    refreshSubscription();
                  }}
                  onError={(error) => toast.error(error)}
                  className={`w-full font-semibold py-4 text-lg ${
                    index === 0 ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                    index === 1 ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                    'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  } text-white`}
                >
                  Assinar Agora
                </StripeCheckout>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Features Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-12">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Comparação de Planos
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Veja o que está incluído em cada plano
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Funcionalidades Principais</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Controle de Mesas e Comandas</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">PDV Integrado</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Controle de Estoque</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Cardápio Digital com QR Code</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Relatórios de Vendas</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Suporte e Segurança</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Headphones className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Suporte Técnico 24/7</span>
                </li>
                <li className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Segurança de Dados</span>
                </li>
                <li className="flex items-center">
                  <Zap className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Atualizações Automáticas</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Benefícios Extras</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Gift className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Descontos Exclusivos</span>
                </li>
                <li className="flex items-center">
                  <Award className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Consultoria Especializada</span>
                </li>
                <li className="flex items-center">
                  <Clock className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">Testes Gratuitos</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Histórico de Pedidos
        </h2>
        {orders.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">Nenhum pedido encontrado.</p>
        ) : (
          <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600 text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Data</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Produto</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Valor</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="even:bg-gray-50 dark:even:bg-gray-700">
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{formatDate(order.created)}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{order.product_name}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{formatCurrency(order.amount)}</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{getStatusText(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Planos;