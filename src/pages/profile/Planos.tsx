import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Star,
  Crown,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Calendar,
  DollarSign,
  Shield,
  Headphones,
  TrendingUp,
  Gift,
  Zap,
  Clock,
  Award
} from "lucide-react";
import Button from "../../components/ui/Button";
import StripeCheckout from "../../components/StripeCheckout";
import {
  stripeProducts,
  getProductByPriceId,
  formatPrice,
  getMonthlyEquivalent
} from "../../stripe-config";
import StripeService from "../../services/StripeService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

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
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
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
      console.error("Error loading subscription:", error);
      toast.error("Erro ao carregar dados da assinatura");
    } finally {
      setLoading(false);
    }
  };

  const loadOrderHistory = async () => {
    try {
      const orderData = await StripeService.getUserOrders();
      setOrders(orderData);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "trialing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "past_due":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "trialing":
        return "Período de Teste";
      case "past_due":
        return "Pagamento Pendente";
      case "canceled":
        return "Cancelado";
      default:
        return status;
    }
  };

  // Função declarada apenas uma vez
  function isCurrentPlan(product: any): boolean {
    return subscription?.price_id === product.priceId;
  }

  const currentProduct = subscription?.price_id
    ? getProductByPriceId(subscription.price_id)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Carregando planos...
          </p>
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
          Escolha o plano ideal para o seu negócio e transforme a gestão do seu
          restaurante
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
                  Assinatura Atual
                </h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      subscription.subscription_status
                    )}`}
                  >
                    {getStatusText(subscription.subscription_status)}
                  </span>
                  {currentProduct && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentProduct.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {subscription.current_period_end && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Próxima cobrança
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
        {/* Monthly Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Plano Mensal</h3>
                <p className="text-blue-100 mt-1">Flexibilidade total</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                R$ 120
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  /mês
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Faturamento mensal
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Todas as funcionalidades
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Suporte técnico incluído
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Atualizações automáticas
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Backup automático
                </span>
              </li>
            </ul>

            {isCurrentPlan(stripeProducts[0]) ? (
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
                product={stripeProducts[0]}
                onSuccess={() => {
                  toast.success("Redirecionando para o checkout...");
                  refreshSubscription();
                }}
                onError={(error) => toast.error(error)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 text-lg"
              >
                Começar Agora
              </StripeCheckout>
            )}
          </div>
        </div>

        {/* Annual Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-400 hover:shadow-2xl transition-all duration-300 relative">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-bl-2xl font-bold text-sm shadow-lg">
            <div className="flex items-center">
              <Gift className="w-4 h-4 mr-1" />
              10% OFF
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Plano Anual</h3>
                <p className="text-yellow-100 mt-1">Melhor custo-benefício</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                R$ 1.296
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  /ano
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Equivalente a R$ 108/mês
              </p>
              <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Economia de R$ 144/ano
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Todas as funcionalidades
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Suporte prioritário
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Relatórios avançados
                </span>
              </li>
              <li className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  Consultoria gratuita
                </span>
              </li>
            </ul>

            {isCurrentPlan(stripeProducts[1]) ? (
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
                product={stripeProducts[1]}
                onSuccess={() => {
                  toast.success("Redirecionando para o checkout...");
                  refreshSubscription();
                }}
                onError={(error) => toast.error(error)}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 text-lg"
              >
                <div className="flex items-center justify-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Teste Grátis 7 Dias
                </div>
              </StripeCheckout>
            )}
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Funcionalidades Principais
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Controle de Mesas e Comandas
                  </span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    PDV Integrado
                  </span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Controle de Estoque
                  </span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Cardápio Digital com QR Code
                  </span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Relatórios de Vendas
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Suporte e Segurança
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Headphones className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Suporte Técnico 24/7
                  </span>
                </li>
                <li className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Segurança de Dados
                  </span>
                </li>
                <li className="flex items-center">
                  <Zap className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Atualizações Automáticas
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Benefícios Extras
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Gift className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Descontos Exclusivos
                  </span>
                </li>
                <li className="flex items-center">
                  <Award className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Consultoria Especializada
                  </span>
                </li>
                <li className="flex items-center">
                  <Clock className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Testes Gratuitos
                  </span>
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
          <p className="text-gray-600 dark:text-gray-400">
            Nenhum pedido encontrado.
          </p>
        ) : (
          <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600 text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                  Data
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                  Produto
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                  Valor
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="even:bg-gray-50 dark:even:bg-gray-700"
                >
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    {formatDate(order.created)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    {order.product_name}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    {getStatusText(order.status)}
                  </td>
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
