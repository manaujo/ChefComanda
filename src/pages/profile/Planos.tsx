import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, Star, Crown, AlertTriangle, ExternalLink, 
  Loader2, Calendar, DollarSign, Shield, Headphones, TrendingUp,
  Gift, Zap, Clock, Award, X, Edit, Coffee, ClipboardList,
  Package, BarChart3, QrCode, PenSquare, Calculator, Users,
  Utensils, Globe, FileText, ChefHat, Smartphone, Wifi,
  Database, Lock, Bell, Settings, RefreshCw, Eye, Activity,
  Truck, Building, Phone, Mail, MapPin, Camera, Download,
  Upload, Printer, Receipt, Target, Gauge, Layers, Box,
  Archive, Clipboard, PieChart, LineChart, TrendingDown,
  ArrowRight, CheckCircle, XCircle, AlertCircle, Info
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
  const [effectiveSubscription, setEffectiveSubscription] = useState<any>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [canceling, setCanceling] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
      loadOrderHistory();
      checkEmployeeStatus();
    }
  }, [user]);

  const checkEmployeeStatus = async () => {
    if (!user) return;
    
    try {
      const { data: employeeData, error } = await supabase
        .from('employees')
        .select('auth_user_id, name, role')
        .eq('auth_user_id', user.id)
        .eq('active', true)
        .maybeSingle();
      
      if (!error && employeeData) {
        setIsEmployee(true);
        
        // Load effective subscription for employee
        const { data: effectiveData, error: effectiveError } = await supabase
          .rpc('get_effective_subscription_details', { p_user_id: user.id });
        
        if (!effectiveError && effectiveData && effectiveData.length > 0) {
          setEffectiveSubscription(effectiveData[0]);
          console.log('📋 Effective subscription for employee:', effectiveData[0]);
        }
      }
    } catch (error) {
      console.error('Error checking employee status:', error);
    }
  };

  const loadSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
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
      console.log('📋 Loading order history...');
      const orderData = await StripeService.getUserOrders();
      console.log('📋 Order data received:', orderData);
      setOrders(orderData);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erro ao carregar histórico de pagamentos');
    }
  };

  const handleUpgrade = async (targetProduct: any) => {
    try {
      setUpgrading(targetProduct.id);
      
      console.log('🚀 Starting upgrade to:', targetProduct.name, 'Price ID:', targetProduct.priceId);
      
      // Show loading message
      toast.loading(`Preparando checkout para ${targetProduct.name}...`, { id: 'checkout-prep' });
      
      try {
        const { url } = await StripeService.createCheckoutSession({
          priceId: targetProduct.priceId,
          mode: targetProduct.mode,
          successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href
        });
        
        toast.dismiss('checkout-prep');
        
        if (url) {
          // Try to open in new tab first (better for preview environments)
          const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
          
          if (newWindow) {
            // Successfully opened in new tab
            toast.success(`✅ Checkout aberto em nova aba para ${targetProduct.name}`, { duration: 6000 });
            
            // Show instructions
            toast('💡 Complete o pagamento na nova aba e retorne aqui para ver o acesso liberado', {
              duration: 10000,
              icon: '💳'
            });
          } else {
            // Fallback to same window if popup blocked
            toast.success(`✅ Redirecionando para pagamento do ${targetProduct.name}...`, { duration: 2000 });
            
            setTimeout(() => {
              window.location.href = url;
            }, 1000);
          }
        } else {
          throw new Error('URL do checkout não foi retornada');
        }
      } catch (checkoutError) {
        toast.dismiss('checkout-prep');
        throw checkoutError;
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('No such price') || error.message.includes('Price ID não encontrado')) {
          toast.error('🔧 Produto não encontrado no Stripe. Verifique se o produto está ativo no Dashboard.');
        } else if (error.message.includes('User not authenticated')) {
          toast.error('🔐 Sessão expirada. Faça login novamente para continuar.');
        } else if (error.message.includes('Failed to create checkout session')) {
          toast.error('🛒 Erro ao criar sessão de checkout. Tente novamente em alguns instantes.');
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

  const handleCancelSubscription = async () => {
    if (!subscription?.subscription_id) return;

    try {
      setCanceling(true);
      await StripeService.cancelSubscription(subscription.subscription_id);
      await loadSubscriptionData();
      await refreshSubscription();
      toast.success('Assinatura cancelada com sucesso. Você manterá acesso até o final do período atual.');
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setCanceling(false);
    }
  };

  const canUpgrade = (product: any) => {
    if (!subscription) return true;
    
    const currentProduct = getProductByPriceId(subscription.price_id);
    if (!currentProduct) return true;
    
    return product.price > currentProduct.price || 
           product.accessDuration > currentProduct.accessDuration;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'trialing':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'past_due':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'canceled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPaymentMethodIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 American Express';
      case 'elo':
        return '💳 Elo';
      default:
        return '💳 Cartão';
    }
  };

  function isCurrentPlan(product: any): boolean {
    return subscription?.price_id === product.priceId;
  }

  const currentProduct = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null;

  // Todas as funcionalidades do ChefComanda
  const allFeatures = [
    {
      category: "Gestão de Mesas e Atendimento",
      icon: <Coffee className="w-5 h-5" />,
      items: [
        "Controle completo de mesas em tempo real",
        "Sistema de comandas digitais",
        "Gestão de garçons e atendimento",
        "Status visual das mesas (livre/ocupada/aguardando)",
        "Histórico completo de atendimento",
        "Controle de capacidade por mesa"
      ]
    },
    {
      category: "PDV e Sistema de Vendas",
      icon: <CreditCard className="w-5 h-5" />,
      items: [
        "PDV completo com múltiplas formas de pagamento",
        "Controle de caixa por operador",
        "Pedidos rápidos (balcão, delivery, take-away)",
        "Integração com PIX, cartão e dinheiro",
        "Fechamento automático de caixa",
        "Relatórios de vendas em tempo real"
      ]
    },
    {
      category: "Controle de Estoque e CMV",
      icon: <Package className="w-5 h-5" />,
      items: [
        "Gestão completa de insumos e matérias-primas",
        "Controle de estoque mínimo com alertas",
        "Movimentações de entrada e saída",
        "Cálculo automático de CMV (Custo da Mercadoria Vendida)",
        "Análise de margem de lucro por produto",
        "Relatórios de rentabilidade"
      ]
    },
    {
      category: "Cardápio Digital e QR Code",
      icon: <QrCode className="w-5 h-5" />,
      items: [
        "Editor de cardápio online profissional",
        "QR Code personalizado para cada mesa",
        "Cardápio público responsivo para clientes",
        "Upload de imagens dos produtos",
        "Categorização automática de produtos",
        "Atualização em tempo real do cardápio"
      ]
    },
    {
      category: "Relatórios e Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
      items: [
        "Dashboard executivo em tempo real",
        "Relatórios de vendas por período",
        "Análise de produtos mais vendidos",
        "Performance de garçons e funcionários",
        "Relatórios de caixa e movimentações",
        "Métricas de eficiência operacional"
      ]
    },
    {
      category: "Gestão de Funcionários",
      icon: <Users className="w-5 h-5" />,
      items: [
        "Sistema de login por tipo de funcionário",
        "Controle de permissões por cargo",
        "Funcionários: Garçom, Caixa, Estoque, Cozinha",
        "Relatórios individuais de performance",
        "Controle de acesso granular",
        "Auditoria completa de ações"
      ]
    },
    {
      category: "Cozinha e Produção",
      icon: <ChefHat className="w-5 h-5" />,
      items: [
        "Comandas da cozinha em tempo real",
        "Controle de status dos pedidos",
        "Tempo de preparo por item",
        "Fila de produção organizada",
        "Notificações automáticas",
        "Interface otimizada para cozinha"
      ]
    },
    {
      category: "Tecnologia e Segurança",
      icon: <Shield className="w-5 h-5" />,
      items: [
        "Sistema 100% online e seguro",
        "Backup automático na nuvem",
        "Acesso de qualquer dispositivo",
        "Sincronização em tempo real",
        "Dados criptografados",
        "Suporte técnico especializado 24/7"
      ]
    }
  ];

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
          <div className="relative">
            <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <Star className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-6">
          Planos ChefComanda
        </h1>
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 rounded-2xl text-lg font-semibold shadow-lg">
            <Shield className="w-5 h-5 mr-3" />
            Pagamentos 100% seguros via Stripe
          </div>
        </div>
        <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
          Sistema completo de gestão para restaurantes, bares e lanchonetes. 
          Transforme a gestão do seu estabelecimento com tecnologia de ponta.
        </p>
      </div>

      {/* Current Subscription Status */}
      {(subscription || effectiveSubscription) && (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden mb-12">
          {/* Header da Assinatura */}
          <div className={`p-8 ${
            effectiveSubscription && effectiveSubscription.is_inherited
              ? 'bg-gradient-to-r from-green-600 via-green-700 to-emerald-700'
              : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-6">
                  {effectiveSubscription && effectiveSubscription.is_inherited ? (
                    <Users className="w-8 h-8 text-white" />
                  ) : (
                    <Crown className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {effectiveSubscription && effectiveSubscription.is_inherited 
                      ? `${effectiveSubscription.plan_name} (Herdado)`
                      : currentProduct ? currentProduct.name : 'Sua Assinatura'
                    }
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {getStatusIcon((effectiveSubscription || subscription).subscription_status || (effectiveSubscription || subscription).status)}
                      <span className="ml-2 text-lg font-semibold">
                        {getStatusText((effectiveSubscription || subscription).subscription_status || (effectiveSubscription || subscription).status)}
                      </span>
                    </div>
                    {(currentProduct || effectiveSubscription) && (
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                        <span className="text-white font-semibold">
                          {effectiveSubscription && effectiveSubscription.is_inherited
                            ? 'Plano Compartilhado'
                            : currentProduct 
                              ? `${formatPrice(currentProduct.price)}/${currentProduct.interval === 'year' ? 'ano' : 
                                 currentProduct.interval === 'quarter' ? 'trimestre' : 'mês'}`
                              : 'Plano Ativo'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  {effectiveSubscription && effectiveSubscription.is_inherited && (
                    <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="flex items-center">
                        <Info className="w-5 h-5 text-white mr-3" />
                        <div className="text-white">
                          <p className="font-semibold">Acesso Herdado</p>
                          <p className="text-sm opacity-90">
                            Administrador: {effectiveSubscription.owner_name || 'Conta Principal'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Informações da Assinatura */}
              <div className="lg:col-span-2 space-y-6">
                {/* Aviso para Funcionários */}
                {effectiveSubscription && effectiveSubscription.is_inherited && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center">
                      <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          Funcionário com Acesso Herdado
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400">
                          Você tem acesso completo através do plano da conta principal. 
                          Para alterar o plano, entre em contato com o administrador.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Próxima Cobrança */}
                {(effectiveSubscription || subscription)?.current_period_end && !effectiveSubscription?.is_inherited && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                        <div>
                          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">
                            Próxima Cobrança
                          </h3>
                          <p className="text-blue-600 dark:text-blue-400">
                            {(effectiveSubscription || subscription).cancel_at_period_end ? 'Assinatura expira em' : 'Renovação automática em'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                          {formatDate((effectiveSubscription || subscription).current_period_end)}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {Math.ceil(((effectiveSubscription || subscription).current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Método de Pagamento */}
                {(effectiveSubscription || subscription)?.payment_method_brand && (effectiveSubscription || subscription)?.payment_method_last4 && !effectiveSubscription?.is_inherited && (
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
                        <div>
                          <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            Método de Pagamento
                          </h3>
                          <p className="text-purple-600 dark:text-purple-400">
                            {getPaymentMethodIcon((effectiveSubscription || subscription).payment_method_brand)} •••• {(effectiveSubscription || subscription).payment_method_last4}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowPaymentMethodModal(true)}
                        icon={<Edit size={16} />}
                        className="bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200/50 dark:hover:bg-purple-900/50"
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ações da Assinatura */}
                {!effectiveSubscription?.is_inherited && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700/20 dark:to-slate-700/20 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Gerenciar Assinatura
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {(effectiveSubscription || subscription)?.subscription_status === 'active' && !(effectiveSubscription || subscription)?.cancel_at_period_end && (
                      <Button
                        variant="warning"
                        onClick={() => setShowCancelModal(true)}
                        icon={<X size={16} />}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      >
                        Cancelar Assinatura
                      </Button>
                    )}
                    
                    {(effectiveSubscription || subscription)?.cancel_at_period_end && (
                      <div className="flex items-center space-x-4">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-xl font-semibold">
                          ⚠️ Assinatura será cancelada em {formatDate((effectiveSubscription || subscription).current_period_end!)}
                        </div>
                        <a 
                          href="https://wa.me/5562982760471?text=Olá! Gostaria de reativar minha assinatura do ChefComanda."
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button 
                            variant="success"
                            icon={<RefreshCw size={16} />}
                          >
                            Reativar
                          </Button>
                        </a>
                      </div>
                    )}

                    <a 
                      href="https://wa.me/5562982760471?text=Olá! Preciso de ajuda com minha assinatura do ChefComanda."
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button 
                        variant="ghost"
                        icon={<Headphones size={16} />}
                        className="bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200/50"
                      >
                        Suporte
                      </Button>
                    </a>
                  </div>
                </div>
                )}
              </div>

              {/* Resumo da Assinatura */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Resumo da Conta
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Plano Atual</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {effectiveSubscription && effectiveSubscription.is_inherited
                          ? `${effectiveSubscription.plan_name} (Herdado)`
                          : currentProduct?.name || 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor((effectiveSubscription || subscription)?.subscription_status || (effectiveSubscription || subscription)?.status)}`}>
                        {getStatusText((effectiveSubscription || subscription)?.subscription_status || (effectiveSubscription || subscription)?.status)}
                      </span>
                    </div>
                    {(effectiveSubscription || subscription)?.current_period_start && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Início do Período</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatDate((effectiveSubscription || subscription).current_period_start)}
                        </span>
                      </div>
                    )}
                    {(currentProduct || effectiveSubscription) && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Valor</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {effectiveSubscription && effectiveSubscription.is_inherited
                            ? 'Incluído no plano principal'
                            : currentProduct 
                              ? formatPrice(currentProduct.price)
                              : 'N/A'
                          }
                        </span>
                      </div>
                    )}
                    {effectiveSubscription && effectiveSubscription.is_inherited && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Administrador</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {effectiveSubscription.owner_name || 'Conta Principal'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefícios do Plano Atual */}
                {(currentProduct || effectiveSubscription) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/50">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-4">
                      ✨ {effectiveSubscription && effectiveSubscription.is_inherited ? 'Acesso Herdado Inclui' : 'Seu Acesso Inclui'}
                    </h3>
                    <ul className="space-y-2">
                      {(currentProduct?.features || [
                        'Acesso completo ao sistema',
                        'Controle de mesas e comandas',
                        'PDV integrado',
                        'Gestão de estoque',
                        'Relatórios avançados',
                        'Cardápio digital com QR Code'
                      ]).slice(0, 6).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                          <span className="text-green-700 dark:text-green-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {!isEmployee && (
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Escolha o Plano Ideal
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Todos os planos incluem acesso completo a todas as funcionalidades
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-2xl font-semibold">
            <Gift className="w-5 h-5 mr-2" />
            Diferem apenas na duração - Mesmo acesso completo
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {stripeProducts.map((product, index) => (
            <div 
              key={product.id}
              className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-105 ${
                product.popular 
                  ? 'border-2 border-yellow-400 ring-4 ring-yellow-100 dark:ring-yellow-900/30 relative' 
                  : 'border border-gray-200 dark:border-gray-700'
              } ${isCurrentPlan(product) ? 'ring-4 ring-blue-500/50' : ''}`}
            >
              {product.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-2" />
                      MAIS POPULAR
                    </div>
                  </div>
                </div>
              )}

              {isCurrentPlan(product) && (
                <div className="absolute -top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-2xl font-bold text-sm shadow-xl">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      ATUAL
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`px-8 py-8 ${
                product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                product.id === 'anual' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                'bg-gradient-to-r from-green-500 to-green-600'
              }`}>
                <div className="text-center">
                  <div className="p-4 bg-white/20 rounded-2xl w-fit mx-auto mb-6">
                    {product.id === 'mensal' ? <Calendar className="w-8 h-8 text-white" /> :
                     product.id === 'trimestral' ? <Star className="w-8 h-8 text-white" /> :
                     product.id === 'anual' ? <Award className="w-8 h-8 text-white" /> :
                     <Zap className="w-8 h-8 text-white" />}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{product.name}</h3>
                  <p className={`text-lg ${
                    product.id === 'mensal' ? 'text-blue-100' :
                    product.id === 'trimestral' ? 'text-purple-100' :
                    product.id === 'anual' ? 'text-orange-100' :
                    'text-green-100'
                  }`}>
                    {product.description}
                  </p>
                </div>
              </div>
              
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {formatPrice(product.price)}
                    <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                      /{product.interval === 'year' ? 'ano' : 
                        product.interval === 'quarter' ? 'trimestre' : 'mês'}
                    </span>
                  </div>
                  {product.interval !== 'month' && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Equivalente a {formatPrice(getMonthlyEquivalent(product))}/mês
                    </p>
                  )}
                  {product.discount && (
                    <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-medium">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Economia de {formatPrice(product.discount.savings)}
                    </div>
                  )}
                </div>
                
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-center">
                    ✅ Acesso Completo Incluso
                  </h4>
                  <ul className="space-y-3 text-sm">
                    {product.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3 flex-shrink-0">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrentPlan(product) ? (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 px-6 py-4 rounded-2xl font-bold text-lg">
                      <CheckCircle className="w-6 h-6 inline mr-2" />
                      Plano Atual
                    </div>
                  </div>
                ) : canUpgrade(product) ? (
                  <StripeCheckout
                    product={product}
                    onSuccess={() => {
                      window.location.reload();
                    }}
                    onError={(error) => console.error(error)}
                    className={`w-full font-bold py-4 text-lg ${
                      product.id === 'mensal' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                      product.id === 'trimestral' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                      product.id === 'anual' ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800' :
                      'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    } text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
                  >
                    {upgrading === product.id ? 'Processando...' : 'Assinar Agora'}
                  </StripeCheckout>
                ) : (
                  <div className="text-center">
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-6 py-4 rounded-2xl font-bold">
                      Não Disponível
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
      
      {/* Mensagem para Funcionários */}
      {isEmployee && (
        <div className="mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 border border-blue-200/50 dark:border-blue-700/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-2xl">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-4">
              Conta de Funcionário
            </h2>
            <p className="text-xl text-blue-600 dark:text-blue-400 mb-6">
              Você tem acesso completo ao ChefComanda através do plano ativo da conta principal.
              Para alterar planos ou gerenciar assinaturas, entre em contato com o administrador.
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-2xl font-semibold">
              <CheckCircle className="w-5 h-5 mr-2" />
              Acesso Completo Ativo
            </div>
          </div>
        </div>
      )}

      {/* Funcionalidades Completas */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden mb-12">
        <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 p-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Funcionalidades Completas do ChefComanda
          </h2>
          <p className="text-xl text-gray-200 mb-6">
            Sistema mais completo do mercado para gestão de restaurantes
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-2xl">
            <Zap className="w-5 h-5 text-yellow-300 mr-2" />
            <span className="text-white font-semibold">
              Todos os planos incluem 100% das funcionalidades
            </span>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {allFeatures.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mr-4">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {category.category}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full mr-3 mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-8 py-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <Receipt className="w-6 h-6 text-gray-600 dark:text-gray-400 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Histórico de Pagamentos
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Suas últimas transações e faturas
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-8">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum pagamento encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Seus pagamentos aparecerão aqui após a primeira compra. 
                O histórico pode levar alguns minutos para aparecer após o pagamento.
              </p>
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={loadOrderHistory}
                  icon={<RefreshCw size={16} />}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Atualizar Histórico
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Data</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Descrição</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Valor</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-4 px-6 text-gray-900 dark:text-white">
                        {new Date(order.order_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-gray-900 dark:text-white">
                        Assinatura ChefComanda
                      </td>
                      <td className="py-4 px-6 text-gray-900 dark:text-white font-semibold">
                        {formatCurrency(order.amount_total || 0)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.payment_status || 'paid')}`}>
                          {getStatusText(order.payment_status || 'paid')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Download size={14} />}
                          onClick={() => toast.success('Recibo baixado!')}
                        >
                          Recibo
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Cancelar Assinatura
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tem certeza que deseja cancelar sua assinatura?
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-semibold mb-1">Importante:</p>
                      <ul className="space-y-1">
                        <li>• Você manterá acesso até {subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'o final do período'}</li>
                        <li>• Não haverá reembolso do período atual</li>
                        <li>• Você pode reativar a qualquer momento</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1"
                  >
                    Manter Assinatura
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleCancelSubscription}
                    isLoading={canceling}
                    className="flex-1"
                  >
                    {canceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Método de Pagamento */}
      {showPaymentMethodModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Alterar Método de Pagamento
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Gerencie seu cartão de crédito
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-semibold mb-1">Método Atual:</p>
                      <p>{getPaymentMethodIcon(subscription?.payment_method_brand || '')} •••• {subscription?.payment_method_last4}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Para alterar seu método de pagamento, entre em contato com nosso suporte. 
                    Nossa equipe irá ajudá-lo com segurança total.
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowPaymentMethodModal(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  <a 
                    href="https://wa.me/5562982760471?text=Olá! Gostaria de alterar o método de pagamento da minha assinatura do ChefComanda."
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      variant="primary"
                      fullWidth
                      icon={<ExternalLink size={16} />}
                    >
                      Contatar Suporte
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 rounded-3xl p-8 text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
            <Headphones className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Precisa de Ajuda?
        </h2>
        <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
          Nossa equipe especializada está pronta para ajudar você a escolher o melhor plano 
          e aproveitar ao máximo o ChefComanda
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://wa.me/5562982760471?text=Olá! Preciso de ajuda com os planos do ChefComanda."
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-8 py-4 text-lg font-semibold"
              icon={<Phone size={20} />}
            >
              WhatsApp: (62) 98276-0471
            </Button>
          </a>
          <a 
            href="mailto:chefcomandaoficial@gmail.com?subject=Dúvidas sobre Planos ChefComanda"
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-8 py-4 text-lg font-semibold"
              icon={<Mail size={20} />}
            >
              E-mail: chefcomandaoficial@gmail.com
            </Button>
          </a>
        </div>
        <div className="mt-6 text-green-100">
          <p className="text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            Atendimento: Segunda a Sexta, 8h às 18h | WhatsApp 24/7
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planos;