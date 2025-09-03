import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, Star, Crown, AlertTriangle, ExternalLink, 
  Loader2, Calendar, DollarSign, Shield, Headphones, TrendingUp,
  Gift, Zap, Clock, Award
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
  const [orders, setOrders] = useState<any[]>([]);
  const [canceling, setCanceling] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

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

  const handleUpgrade = async (targetProduct: any) => {
    try {
      setUpgrading(targetProduct.id);
      
      console.log('🚀 Starting upgrade to:', targetProduct.name, 'Price ID:', targetProduct.priceId);
      
      // Create checkout session for upgrade
      const { url } = await StripeService.createCheckoutSession({
        priceId: targetProduct.priceId,
        mode: targetProduct.mode,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href
      });
      
      console.log('✅ Checkout session created, redirecting...');
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Checkout URL was not returned');
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('No such price') || error.message.includes('Price ID não encontrado')) {
          toast.error('🔧 Produto não encontrado no Stripe. Verifique se o produto está ativo.');
        } else if (error.message.includes('User not authenticated')) {
          toast.error('🔐 Sessão expirada. Faça login novamente.');
        } else if (error.message.includes('Failed to create checkout session')) {
          toast.error('🛒 Erro ao criar sessão de checkout. Tente novamente.');
        } else {
          toast.error(`Erro no processamento: ${error.message}`);
        }
      } else {
        toast.error('Erro desconhecido ao fazer upgrade do plano');
      }
    } finally {
      setUpgrading(null);
    }
  };

  const canUpgrade = (product: any) => {
    if (!subscription) return true;
    
    const currentProduct = getProductByPriceId(subscription.price_id);
    if (!currentProduct) return true;
    
    // Allow upgrade if target product has higher price or longer duration
    return product.price > currentProduct.price || 
           product.accessDuration > currentProduct.accessDuration;
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
      case 'trialing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
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
      case 'trialing':
        return 'Período de Teste';
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
        <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium mb-4">
          <Shield className="w-4 h-4 mr-2" />
          Pagamentos seguros via Stripe
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Escolha o plano ideal para o seu negócio e transforme a gestão do seu restaurante
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mr-4">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentProduct ? currentProduct.name : 'Plano Atual'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.subscription_status)}`}>
                    {getStatusText(subscription.subscription_status)}
                  </span>
                  {currentProduct && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {currentProduct.description}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {subscription.current_period_end && (
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Próxima cobrança</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}
          </div>

          {/* Cancel Subscription */}
          {subscription && subscription.subscription_status === 'active' && !subscription.cancel_at_period_end && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Cancelar Assinatura</h4>
              <p className="text-sm text-red-700 mb-4">
                Sua assinatura será cancelada no final do período atual.
              </p>
              <Button
                variant="danger"
                isLoading={canceling}
                onClick={async () => {
                  if (confirm('Tem certeza que deseja cancelar sua assinatura?')) {
                    try {
                      setCanceling(true);
                      await StripeService.cancelSubscription(subscription.subscription_id!);
                      await loadSubscriptionData();
                      await refreshSubscription();
                      toast.success('Assinatura cancelada com sucesso');
                    } catch (error) {
                      console.error('Error canceling subscription:', error);
                      toast.error('Erro ao cancelar assinatura');
                    } finally {
                      setCanceling(false);
                    }
                  }
                }}
                size="sm"
              >
                {canceling ? 'Cancelando...' : 'Cancelar Assinatura'}
              </Button>
            </div>
          )}

          {/* Subscription Canceled Notice */}
          {subscription && subscription.cancel_at_period_end && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Assinatura Cancelada</h4>
              <p className="text-sm text-yellow-700 mb-4">
                Sua assinatura terminará em {formatDate(subscription.current_period_end!)}. 
                Você ainda tem acesso completo até esta data.
              </p>
              <div className="flex space-x-3">
                <a 
                  href="https://wa.me/5562982760471?text=Olá! Gostaria de reativar minha assinatura do ChefComanda."
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    Reativar Assinatura
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
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
              product.id === 'teste' ? 'bg-gradient-to-r from-green-600 to-green-700' :
              product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
              product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
              product.id === 'anual' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
              'bg-gradient-to-r from-gray-500 to-gray-600'
            }`}>
              <div className="text-center">
                <div className="p-3 bg-white/20 rounded-full w-fit mx-auto mb-4">
                  {product.id === 'teste' ? <Gift className="w-6 h-6 text-white" /> :
                   product.id === 'mensal' ? <Calendar className="w-6 h-6 text-white" /> :
                   product.id === 'trimestral' ? <Star className="w-6 h-6 text-white" /> :
                   product.id === 'anual' ? <Award className="w-6 h-6 text-white" /> :
                   <Zap className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-white">{product.name}</h3>
                <p className={`mt-2 text-sm ${
                  product.id === 'teste' ? 'text-green-100' :
                  product.id === 'mensal' ? 'text-blue-100' :
                  product.id === 'trimestral' ? 'text-purple-100' :
                  product.id === 'anual' ? 'text-orange-100' :
                  'text-gray-100'
                }`}>
                  {product.description}
                </p>
              </div>
            </div>
            
            <div className="px-8 py-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatPrice(product.price)}
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                    /{product.interval === 'year' ? 'ano' : 'mês'}
                  </span>
                </div>
                {product.interval === 'year' && (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Equivalente a {formatPrice(getMonthlyEquivalent(product))}/mês
                    </p>
                    {product.discount && (
                      <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-medium">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        Economia de {formatPrice(product.discount.savings)}/ano
                      </div>
                    )}
                  </>
                )}
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
              ) : canUpgrade(product) ? (
                <div>
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={() => handleUpgrade(product)}
                    isLoading={upgrading === product.id}
                    className={`font-semibold py-4 text-lg ${
                      product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                      product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                      product.id === 'anual' ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800' :
                      'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                    } text-white`}
                  >
                    {upgrading === product.id ? 'Processando...' : 'Assinar Agora'}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  fullWidth 
                  size="lg"
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  Não Disponível
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8">
        <div className="flex items-start">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-1 mr-4 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              ⚙️ Configuração dos Price IDs Necessária
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Para que os planos funcionem com seus produtos reais, você precisa:
            </p>
            <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p><strong>1. Obter os Price IDs reais:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Acesse <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard → Products</a></li>
                <li>Clique em cada produto</li>
                <li>Copie o Price ID (começa com <code>price_</code>)</li>
              </ol>
              <p className="mt-3"><strong>2. Atualizar arquivo de configuração:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Abra o arquivo <code className="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">src/stripe-config.ts</code></li>
                <li>Substitua <code>PRICE_ID_TESTE</code> pelo Price ID do produto "Teste"</li>
                <li>Substitua <code>PRICE_ID_MENSAL</code> pelo Price ID do "Plano Mensal"</li>
                <li>Substitua <code>PRICE_ID_TRIMESTRAL</code> pelo Price ID do "Plano Trimestral"</li>
                <li>Substitua <code>PRICE_ID_ANUAL</code> pelo Price ID do "Plano Anual"</li>
              </ol>
            </div>
          </div>
        </div>
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