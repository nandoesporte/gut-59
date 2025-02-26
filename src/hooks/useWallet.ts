
import { useWalletQuery, useTransactionsQuery } from './wallet/queries';
import { useWalletMutations } from './wallet/mutations';

export const useWallet = () => {
  const walletQuery = useWalletQuery();
  const transactionsQuery = useTransactionsQuery(walletQuery.data?.id);
  const mutations = useWalletMutations(walletQuery.data?.id);

  return {
    wallet: walletQuery.data ? {
      ...walletQuery.data,
      // Garantir que o saldo nunca seja negativo e que seja um número
      balance: Math.max(0, walletQuery.data.balance || 0)
    } : null,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: mutations.addTransaction.mutate,
    createTransferQRCode: mutations.createQRCode.mutateAsync,
    redeemQRCode: mutations.redeemQRCode.mutate
  };
};
