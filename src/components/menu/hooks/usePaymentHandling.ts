
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

  // Check URL parameters for payment status on mount and when URL changes
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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  const handlePaymentSuccess = () => {
    console.log("Pagamento confirmado, atualizando estado...");
    setHasPaid(true);
    setShowConfirmation(true);
    toast.success("Pagamento confirmado com sucesso!");

    // Limpa o intervalo de verificação após confirmação
    if (checkInterval) {
      clearInterval(checkInterval);
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

      // Start polling for payment status
      const intervalId = window.setInterval(async () => {
        console.log("Verificando status do pagamento...");
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user?.id) {
          clearInterval(intervalId);
          setCheckInterval(null);
          return;
        }

        const isPaid = await checkPaymentStatus(
          newPreferenceId,
          userData.user.id,
          planType,
          currentPrice,
          handlePaymentSuccess
        );

        if (isPaid) {
          clearInterval(intervalId);
          setCheckInterval(null);
          handlePaymentSuccess();
        }
      }, 5000);

      setCheckInterval(intervalId);

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(intervalId);
        setCheckInterval(null);
      }, 600000);

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
