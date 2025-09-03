import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import StripeService from '../../services/StripeService';
import { getProductByPriceId } from '../../stripe-config';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      // Wait a moment for webhook to process
      console.log('⏳ Waiting for webhook processing...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aumentar tempo de espera
      
      // Tentar sincronizar assinatura primeiro
      try {
        await StripeService.syncSubscription();
        console.log('✅ Subscription synced via Edge Function');
      } catch (syncError) {
        console.warn('⚠️ Sync error, trying to load data directly:', syncError);
      }
      
      const subscriptionData = await StripeService.getUserSubscription();
      console.log('📋 Subscription data loaded:', subscriptionData);
      setSubscription(subscriptionData);
      
      // Refresh auth context subscription data
      try {
        const { refreshSubscription } = await import('../../contexts/AuthContext');
        await refreshSubscription();
        console.log('✅ Auth context updated');
      } catch (error) {
        console.error('❌ Error updating context:', error);
      }
    } catch (error) {
      console.error('❌ Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionProduct = () => {
    if (!subscription?.price_id) return null;
    return getProductByPriceId(subscription.price_id);
  };

  const handleContinue = () => {
    navigate('/');
  };

  const handleViewPlans = () => {
    navigate('/profile/planos');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pagamento Realizado com Sucesso!
            </h2>
            
            {loading ? (
              <p className="text-gray-600 mb-6">
                Processando sua assinatura...
              </p>
            ) : subscription ? (
              <p className="text-gray-600 mb-6">
                Obrigado por escolher o ChefComanda! Sua assinatura foi ativada com sucesso e você já tem acesso completo ao sistema.
              </p>
            ) : (
              <p className="text-gray-600 mb-6">
                Obrigado por escolher o ChefComanda! Sua assinatura está sendo processada e será ativada em breve.
              </p>
            )}

            {loading ? (
              <div className="mb-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : subscription ? (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">
                    Plano Ativo
                  </span>
                </div>
                <p className="text-blue-800 font-semibold">
                  {getSubscriptionProduct()?.name || 'Plano Ativo'}
                </p>
                {getSubscriptionProduct()?.description && (
                  <p className="text-blue-700 text-sm mt-1">
                    {getSubscriptionProduct()?.description}
                  </p>
                )}
                <p className="text-blue-600 text-sm">
                  Status: {subscription.subscription_status === 'active' ? 'Ativo' : 
                          subscription.subscription_status === 'trialing' ? 'Período de Teste' : 'Processando'}
                </p>
                {subscription.current_period_end && (
                  <p className="text-blue-600 text-sm">
                    Próxima cobrança: {new Date(subscription.current_period_end * 1000).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  Sua assinatura está sendo processada. Pode levar alguns minutos para aparecer na sua conta.
                </p>
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadSubscriptionData}
                    className="text-yellow-700 hover:text-yellow-800"
                  >
                    🔄 Verificar Novamente
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleContinue}
                icon={<ArrowRight size={18} />}
              >
                Ir para Dashboard
              </Button>
              
              <Button
                variant="ghost"
                fullWidth
                onClick={handleViewPlans}
              >
                Gerenciar Assinatura
              </Button>
            </div>

            {sessionId && (
              <p className="mt-6 text-xs text-gray-500">
                Session ID: {sessionId}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Precisa de ajuda? Entre em contato com nosso{' '}
          <a href="/dashboard/suporte" className="text-blue-600 hover:text-blue-500">
            suporte
          </a>
          {' '}ou via WhatsApp{' '}
          <a 
            href="https://wa.me/5562982760471" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-500"
          >
            (62) 98276-0471
          </a>
        </p>
      </div>
    </div>
  );
};

export default Success;