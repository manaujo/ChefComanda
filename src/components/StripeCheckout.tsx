import React, { useState } from 'react';
import { CreditCard, Loader2, Zap, Shield } from 'lucide-react';
import Button from './ui/Button';
import StripeService from '../services/StripeService';
import { StripeProduct } from '../stripe-config';
import toast from 'react-hot-toast';

interface StripeCheckoutProps {
  product: StripeProduct;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  product,
  onSuccess,
  onError,
  className = '',
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      console.log('🛒 Iniciando checkout:', {
        productName: product.name,
        priceId: product.priceId,
        mode: product.mode,
        price: product.price
      });
      
      // Show loading toast with better messaging
      const loadingMessage = `🔄 Preparando checkout para ${product.name}...`;
      
      toast.loading(loadingMessage, { id: 'checkout-loading' });
      
      const { url } = await StripeService.createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href
      });
      
      // Dismiss loading toast
      toast.dismiss('checkout-loading');
      
      if (url) {
        // Show success message before redirect
        const successMessage = `✅ Redirecting to ${product.name} payment...`;
        
        toast.success(successMessage, { duration: 2000 });
        
        // Small delay to show the success message
        setTimeout(() => {
          window.location.href = url;
        }, 1000);
        
        onSuccess?.();
      } else {
        throw new Error('Checkout URL not received');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      
      // Dismiss loading toast
      toast.dismiss('checkout-loading');
      
      let errorMessage = 'Payment processing error';
      
      if (error instanceof Error) {
        if (error.message.includes('User not authenticated')) {
          errorMessage = 'Você precisa estar logado para assinar';
        } else if (error.message.includes('No such price') || error.message.includes('Invalid Price ID')) {
          errorMessage = 'Produto não encontrado no Stripe. Verifique se o produto está ativo.';
        } else if (error.message.includes('Failed to create checkout session')) {
          errorMessage = 'Erro ao criar sessão de pagamento. Tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleCheckout}
        isLoading={loading}
        disabled={loading}
        icon={loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        className={`${className} ${loading ? 'cursor-not-allowed' : 'cursor-pointer'} transition-all duration-200 transform hover:scale-105 active:scale-95`}
      >
        {children || (
          <div className="flex items-center justify-center">
            {loading ? 'Processando...' : 'Assinar Agora'}
          </div>
        )}
      </Button>
      
      {/* Security Badge */}
      <div className="flex items-center justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
        <Shield className="w-3 h-3 mr-1" />
        <span>Pagamento seguro via Stripe</span>
      </div>
    </div>
  );
};

export default StripeCheckout;