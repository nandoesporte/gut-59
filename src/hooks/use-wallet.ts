
import { useWalletQuery, useTransactionsQuery } from './wallet/queries';
import { useWalletMutations } from './wallet/mutations';

export const useWallet = () => {
  const walletQuery = useWalletQuery();
  const transactionsQuery = useTransactionsQuery(walletQuery.data?.id);
  const mutations = useWalletMutations(walletQuery.data?.id);

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

// Re-export as useUserWallet to match the import in useMenuController
export const useUserWallet = useWallet;
