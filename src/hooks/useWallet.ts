
import { useWalletQuery, useTransactionsQuery } from './wallet/queries';
import { useWalletMutations } from './wallet/mutations';

export const useWallet = () => {
  const walletQuery = useWalletQuery();
  const transactionsQuery = useTransactionsQuery(walletQuery.data?.id);
  const mutations = useWalletMutations(walletQuery.data?.id);

  // Remover o Math.max aqui pois ele está forçando o saldo a zero
  return {
    wallet: walletQuery.data ? {
      ...walletQuery.data,
      balance: walletQuery.data.balance
    } : null,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: mutations.addTransaction.mutate,
    createTransferQRCode: mutations.createQRCode.mutateAsync,
    redeemQRCode: mutations.redeemQRCode.mutate
  };
};
