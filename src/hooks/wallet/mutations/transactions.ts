
import { useMutation } from '@tanstack/react-query';
import { createWalletTransaction } from '../db/transactions';
import { TransactionInput } from '../types';

export function useTransactionMutations(walletId: string | undefined, invalidateQueries: () => void) {
  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletId) throw new Error('Wallet not initialized');

      // Ensure reward transactions are always positive
      const amount = ['daily_tip', 'water_intake', 'steps', 'meal_plan', 'workout_plan', 'physio_plan'].includes(input.type)
        ? Math.abs(input.amount)  // Force positive for rewards
        : input.amount;          // Keep original sign for other transactions

      console.log('Criando transação:', { walletId, amount, type: input.type });

      await createWalletTransaction({
        walletId,
        amount,
        type: input.type,
        description: input.description,
        recipientId: input.recipientId,
        qrCodeId: input.qrCodeId
      });
    },
    onSuccess: () => {
      console.log('Transação criada com sucesso');
      invalidateQueries();
    },
    onError: (error) => {
      console.error('Erro ao criar transação:', error);
    }
  });

  return { addTransaction };
}
