import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export class StripeClientService {
  private static instance: StripeClientService;

  private constructor() {}

  static getInstance(): StripeClientService {
    if (!StripeClientService.instance) {
      StripeClientService.instance = new StripeClientService();
    }
    return StripeClientService.instance;
  }

  async redirectToCheckout(sessionId: string) {
    try {
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe não foi carregado');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  }

  async confirmPayment(clientSecret: string) {
    try {
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe não foi carregado');
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`
        }
      });

      if (error) {
        throw error;
      }

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }
}

export default StripeClientService.getInstance();