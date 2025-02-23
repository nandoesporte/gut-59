
import { useState, useEffect } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentPrice } from "../utils/payment-db";
import { getSuccessMessage } from "../utils/payment-messages";
import { createPaymentPreference, checkPaymentStatus } from "../utils/payment-processor";

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

// Initialize MercadoPago with public key
initMercadoPago('APP_USR-64b85a56-267c-4056-9484-a2ff9e037db4', {
  locale: 'pt-BR'
});

export const usePaymentHandling = (planType: PlanType = 'nutrition') => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(19.90);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [checkInterval, setCheckInterval] = useState<number | null>(null);

  useEffect(() => {
    const loadPrice = async () => {
      const price = await fetchCurrentPrice(planType);
      setCurrentPrice(price);
    };
    loadPrice();
  }, [planType]);

  // Effect to check payment status every 5 seconds when there's a preferenceId
  useEffect(() => {
    const startPaymentCheck = async () => {
      if (!preferenceId || hasPaid) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) return;

      const checkPayment = async () => {
        console.log(`Verificando status do pagamento ${preferenceId}...`);
        const isPaid = await checkPaymentStatus(
          preferenceId,
          userData.user.id,
          planType,
          currentPrice,
          handlePaymentSuccess
        );

        if (isPaid) {
          console.log('Pagamento confirmado, parando verificação...');
          if (checkInterval) {
            window.clearInterval(checkInterval);
            setCheckInterval(null);
          }
          handlePaymentSuccess();

          // Grant access to the plan
          const { error: grantError } = await supabase.functions.invoke('grant-plan-access', {
            body: { 
              userId: userData.user.id,
              planType: planType
            }
          });

          if (grantError) {
            console.error('Erro ao liberar acesso ao plano:', grantError);
            toast.error("Erro ao liberar acesso ao plano. Por favor, contate o suporte.");
            return;
          }
        }
      };

      // Inicia verificação imediata
      checkPayment();

      // Configura intervalo de 5 segundos
      const intervalId = window.setInterval(checkPayment, 5000);
      setCheckInterval(intervalId);

      // Limpa intervalo após 10 minutos
      const timeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        setCheckInterval(null);
      }, 600000);

      return () => {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
      };
    };

    startPaymentCheck();
  }, [preferenceId, hasPaid, planType, currentPrice]);

  // Check URL parameters for payment status
  useEffect(() => {
    const checkURLParameters = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get('status');
      const message = urlParams.get('message');

      if (status === 'success' && message) {
        setHasPaid(true);
        setShowConfirmation(true);
        toast.success("Pagamento confirmado com sucesso!");
        // Clean up URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    checkURLParameters();
    window.addEventListener('popstate', checkURLParameters);

    return () => {
      window.removeEventListener('popstate', checkURLParameters);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkInterval) {
        window.clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  const handlePaymentSuccess = () => {
    console.log("Pagamento confirmado, atualizando estado...");
    setHasPaid(true);
    setShowConfirmation(true);
    toast.success("Pagamento confirmado com sucesso!");

    if (checkInterval) {
      window.clearInterval(checkInterval);
      setCheckInterval(null);
    }
  };

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      
      const { preferenceId: newPreferenceId, initPoint } = await createPaymentPreference(planType, currentPrice);
      setPreferenceId(newPreferenceId);
      
      // Add success URL with message
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set('status', 'success');
      successUrl.searchParams.set('message', getSuccessMessage(planType));
      
      // Add the success URL to the payment window URL
      const paymentUrl = new URL(initPoint);
      paymentUrl.searchParams.set('back_urls_success', successUrl.toString());
      
      // Open payment window
      window.open(paymentUrl.toString(), '_blank');

    } catch (error) {
      console.error('Erro completo:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation,
    confirmationMessage: getSuccessMessage(planType)
  };
};
