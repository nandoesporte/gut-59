
import { useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';

export const usePaymentHandling = () => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState('');
  const [hasPaid, setHasPaid] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [currentPrice] = useState(19.90);
  
  const wallet = useWallet();

  const handlePaymentAndContinue = async () => {
    try {
      setIsProcessingPayment(true);
      
      // Simulate payment for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setHasPaid(true);
      toast.success('Pagamento processado com sucesso!');
      
      setShowConfirmation(true);
      setConfirmationMessage('Seu plano alimentar personalizado foi desbloqueado com sucesso!');
      
      setIsProcessingPayment(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Erro ao processar o pagamento. Tente novamente.');
      setIsProcessingPayment(false);
    }
  };

  const addTransactionAsync = async (params: Parameters<typeof wallet.addTransaction>[0]) => {
    return new Promise<void>((resolve, reject) => {
      try {
        wallet.addTransaction(params);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  return {
    isProcessingPayment,
    preferenceId,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation,
    confirmationMessage,
    addTransactionAsync
  };
};
