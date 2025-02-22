
import { useState } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Initialize MercadoPago with production public key
initMercadoPago('APP_USR-64b85a56-267c-4056-9484-a2ff9e037db4', {
  locale: 'pt-BR'
});

export const usePaymentHandling = () => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);

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

      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: {
          userId: userData.user.id,
          amount: 19.90,
          description: "Plano Alimentar Personalizado"
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Falha ao criar pagamento: ${error.message}`);
      }

      if (!data?.preferenceId) {
        throw new Error('Resposta inválida do serviço de pagamento');
      }

      setPreferenceId(data.preferenceId);
      window.open(data.initPoint, '_blank');

      // Start polling for payment status
      const checkInterval = setInterval(async () => {
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-mercadopago-payment', {
            body: { preferenceId: data.preferenceId }
          });

          if (statusError) throw statusError;

          if (statusData?.isPaid) {
            clearInterval(checkInterval);
            setHasPaid(true);
            toast.success("Pagamento confirmado! Você já pode selecionar os alimentos.");
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
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
