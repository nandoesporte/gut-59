
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";

export const useWorkoutPayment = () => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);

  const {
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue
  } = usePaymentHandling('workout');

  useEffect(() => {
    checkPaymentSettings();
  }, []);

  const checkPaymentSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('payment_settings')
        .select('is_active')
        .eq('plan_type', 'workout')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar configurações de pagamento:', error);
        return;
      }

      setIsPaymentEnabled(settings?.is_active ?? false);
    } catch (error) {
      console.error('Erro ao verificar configurações de pagamento:', error);
    }
  };

  return {
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isPaymentEnabled,
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue
  };
};
