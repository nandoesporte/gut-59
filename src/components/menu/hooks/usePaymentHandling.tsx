
import { useState } from "react";
import { toast } from "sonner";
import { createPayment, checkPaymentStatus } from "@/services/asaas";

export const usePaymentHandling = () => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      const payment = await createPayment();
      setPreferenceId(payment.preferenceId);
      
      // Start polling for payment status
      const checkInterval = setInterval(async () => {
        try {
          const isPaid = await checkPaymentStatus(payment.id);
          if (isPaid) {
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
      console.error('Erro ao processar pagamento:', error);
      toast.error("Erro ao processar pagamento. Por favor, tente novamente.");
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
