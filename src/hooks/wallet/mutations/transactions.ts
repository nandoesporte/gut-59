
import { useMutation } from '@tanstack/react-query';
import { createWalletTransaction } from '../db/transactions';
import { TransactionInput } from '../types';

export function useTransactionMutations(walletId: string | undefined, invalidateQueries: () => void) {
  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletId) throw new Error('Wallet not initialized');

      await createWalletTransaction({
        walletId,
        amount: input.amount,
        type: input.type,
        description: input.description,
        recipientId: input.recipientId,
        qrCodeId: input.qrCodeId
      });
    },
    onSuccess: invalidateQueries
  });

  return { addTransaction };
}
