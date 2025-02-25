
import { useMutation } from '@tanstack/react-query';
import { findRecipientByEmail, createWalletTransaction } from '../db/transactions';
import { TransactionInput, EmailTransferInput } from '../types';

export function useTransactionMutations(walletId: string | undefined, invalidateQueries: () => void) {
  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletId) throw new Error('Wallet not initialized');
      
      let finalRecipientId = input.recipientId;
      if (input.recipientEmail) {
        finalRecipientId = await findRecipientByEmail(input.recipientEmail);
      }

      await createWalletTransaction({
        walletId,
        amount: input.amount,
        type: input.type,
        description: input.description,
        recipientId: finalRecipientId,
        qrCodeId: input.qrCodeId
      });
    },
    onSuccess: invalidateQueries
  });

  const emailTransfer = useMutation({
    mutationFn: async (input: EmailTransferInput) => {
      if (!walletId) throw new Error('Wallet not initialized');

      const recipientId = await findRecipientByEmail(input.email);
      await createWalletTransaction({
        walletId,
        amount: input.amount,
        type: 'transfer',
        description: input.description || 'Transferência por email',
        recipientId
      });
    },
    onSuccess: invalidateQueries
  });

  return { addTransaction, emailTransfer };
}
