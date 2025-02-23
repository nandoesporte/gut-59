
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

  useEffect(() => {
    const loadPrice = async () => {
      const price = await fetchCurrentPrice(planType);
      setCurrentPrice(price);
    };
    loadPrice();
  }, [planType]);

  const handlePaymentSuccess = () => {
    setHasPaid(true);
    setShowConfirmation(true);
  };

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      
      const { preferenceId: newPreferenceId, initPoint } = await createPaymentPreference(planType, currentPrice);
      setPreferenceId(newPreferenceId);
      window.open(initPoint, '_blank');

      // Start polling for payment status
      const checkInterval = setInterval(async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user?.id) {
          clearInterval(checkInterval);
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
          clearInterval(checkInterval);
        }
      }, 5000);

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
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
