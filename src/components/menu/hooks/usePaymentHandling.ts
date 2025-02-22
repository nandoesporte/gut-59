
import { useState } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Initialize MercadoPago with production public key
initMercadoPago('APP_USR-64b85a56-267c-4056-9484-a2ff9e037db4', {
  locale: 'pt-BR'
});

interface PaymentPayload {
  userId: string;
  amount: number;
  description: string;
}

export const usePaymentHandling = () => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);

  const validatePayload = (payload: PaymentPayload): boolean => {
    if (!payload.userId || typeof payload.userId !== 'string') {
      console.error('Invalid userId:', payload.userId);
      return false;
    }
    if (!payload.amount || typeof payload.amount !== 'number') {
      console.error('Invalid amount:', payload.amount);
      return false;
    }
    if (!payload.description || typeof payload.description !== 'string') {
      console.error('Invalid description:', payload.description);
      return false;
    }
    return true;
  };

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Erro ao obter dados do usuário');
      }

      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Prepare the request payload with strict typing
      const payload: PaymentPayload = {
        userId: userData.user.id,
        amount: 19.90,
        description: "Plano Alimentar Personalizado"
      };

      // Validate payload before sending
      if (!validatePayload(payload)) {
        throw new Error('Dados de pagamento inválidos');
      }

      console.log('Sending payment request with validated payload:', payload);

      const payloadString = JSON.stringify(payload);
      console.log('Stringified payload:', payloadString);

      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: payloadString
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Falha ao criar pagamento: ${error.message}`);
      }

      if (!data?.preferenceId || !data?.initPoint) {
        console.error('Invalid response:', data);
        throw new Error('Resposta inválida do serviço de pagamento');
      }

      setPreferenceId(data.preferenceId);
      window.open(data.initPoint, '_blank');

      // Start polling for payment status
      const checkInterval = setInterval(async () => {
        try {
          if (!data.preferenceId) {
            clearInterval(checkInterval);
            return;
          }

          const checkPayload = { preferenceId: data.preferenceId };
          console.log('Checking payment status with payload:', checkPayload);

          const { data: statusData, error: statusError } = await supabase.functions.invoke(
            'check-mercadopago-payment',
            {
              body: JSON.stringify(checkPayload)
            }
          );

          if (statusError) {
            console.error('Status check error:', statusError);
            throw statusError;
          }

          if (statusData?.isPaid) {
            clearInterval(checkInterval);
            setHasPaid(true);
            toast.success("Pagamento confirmado! Você já pode selecionar os alimentos.");
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
          clearInterval(checkInterval);
        }
      }, 5000);

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 600000);

    } catch (error) {
      console.error('Erro completo:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento. Por favor, tente novamente.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    handlePaymentAndContinue
  };
};
