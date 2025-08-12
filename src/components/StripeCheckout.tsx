import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import StripeService from '../services/StripeService';
import { stripeProducts, StripeProduct } from '../stripe-config';
import toast from 'react-hot-toast';

interface StripeCheckoutProps {
  product: StripeProduct;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  product,
  onSuccess,
  onError,
  className = '',
  children
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      const { url } = await StripeService.createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href
      });
      
      if (url) {
        window.location.href = url;
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleCheckout}
      isLoading={loading}
      icon={loading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
      className={className}
      disabled={loading}
    >
      {children || 'Assinar Agora'}
    </Button>
  );
};

export default StripeCheckout;