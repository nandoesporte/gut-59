
import { useState, useEffect } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    const fetchCurrentPrice = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_settings')
          .select('price')
          .eq('plan_type', planType)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        if (data) {
          setCurrentPrice(data.price);
        }
      } catch (error) {
        console.error('Error fetching price:', error);
        setCurrentPrice(19.90);
      }
    };

    fetchCurrentPrice();
  }, [planType]);

  const updatePaymentStatus = async (userId: string, mercadopagoId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          payment_id: mercadopagoId,
          plan_type: planType,
          amount: currentPrice,
          status: 'completed'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const showSuccessMessage = (planType: PlanType) => {
    const messages = {
      nutrition: "Seu plano nutricional está pronto para ser gerado!",
      workout: "Seu plano de treino está pronto para ser gerado!",
      rehabilitation: "Seu plano de reabilitação está pronto para ser gerado!"
    };

    setShowConfirmation(true);
    toast.success("Pagamento confirmado com sucesso!", {
      description: messages[planType],
      duration: 5000
    });
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

      const descriptions = {
        nutrition: "Plano Alimentar Personalizado",
        workout: "Plano de Treino Personalizado",
        rehabilitation: "Plano de Reabilitação Personalizado"
      };

      const payload = {
        userId: userData.user.id,
        amount: currentPrice,
        description: descriptions[planType]
      };

      console.log('Enviando payload:', payload);

      const { data, error } = await supabase.functions.invoke(
        'create-mercadopago-preference',
        {
          body: payload
        }
      );

      console.log('Resposta da função:', { data, error });

      if (error) {
        console.error('Erro na função:', error);
        throw new Error('Falha ao criar pagamento. Por favor, tente novamente.');
      }

      if (!data || !data.preferenceId || !data.initPoint) {
        throw new Error('Resposta inválida do serviço de pagamento');
      }

      setPreferenceId(data.preferenceId);
      window.open(data.initPoint, '_blank');

      // Polling para verificar status do pagamento
      const checkInterval = setInterval(async () => {
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke(
            'check-mercadopago-payment',
            {
              body: { preferenceId: data.preferenceId }
            }
          );

          console.log('Status do pagamento:', statusData);

          if (statusError) {
            console.error('Erro ao verificar status:', statusError);
            clearInterval(checkInterval);
            return;
          }

          if (statusData?.isPaid) {
            clearInterval(checkInterval);
            await updatePaymentStatus(userData.user.id, data.preferenceId);
            setHasPaid(true);
            showSuccessMessage(planType);

            try {
              // Insert diretamente na tabela plan_access
              const { error: accessError } = await supabase
                .from('plan_access')
                .insert({
                  user_id: userData.user.id,
                  plan_type: planType,
                  is_active: true
                });

              if (accessError) throw accessError;
            } catch (error) {
              console.error('Erro ao registrar acesso ao plano:', error);
              toast.error("Erro ao liberar acesso ao plano. Por favor, contate o suporte.");
            }
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
          clearInterval(checkInterval);
        }
      }, 5000);

      // Para o polling após 10 minutos
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

  const PaymentConfirmationDialog = () => {
    const messages = {
      nutrition: "Seu plano nutricional está pronto para ser gerado!",
      workout: "Seu plano de treino está pronto para ser gerado!",
      rehabilitation: "Seu plano de reabilitação está pronto para ser gerado!"
    };

    return (
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento Confirmado!</DialogTitle>
            <DialogDescription>
              <p className="mt-2">
                {messages[planType]}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Você pode prosseguir com a geração do seu plano.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };

  return {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    PaymentConfirmationDialog
  };
};
