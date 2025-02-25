
import { useQueryClient } from '@tanstack/react-query';
import { useTransactionMutations } from './mutations/transactions';
import { useQRCodeMutations } from './mutations/qrcode';

export function useWalletMutations(walletId: string | undefined) {
  const queryClient = useQueryClient();
  
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const { addTransaction } = useTransactionMutations(walletId, invalidateQueries);
  const { createQRCode, redeemQRCode } = useQRCodeMutations(walletId, invalidateQueries);

  return {
    addTransaction,
    createQRCode,
    redeemQRCode
  };
}
