
import { useWalletQuery, useTransactionsQuery } from './wallet/queries';
import { useWalletMutations } from './wallet/mutations';

export const useWallet = () => {
  const walletQuery = useWalletQuery();
  const transactionsQuery = useTransactionsQuery(walletQuery.data?.id);
  const mutations = useWalletMutations(walletQuery.data?.id);

  return {
    wallet: walletQuery.data,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: mutations.addTransaction.mutate,
    createTransferQRCode: mutations.createQRCode.mutateAsync,
    redeemQRCode: mutations.redeemQRCode.mutate
  };
};
