
import { useEffect } from 'react';
import { useWalletQuery, useTransactionsQuery } from './wallet/queries';
import { useWalletMutations } from './wallet/mutations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useWallet = () => {
  const queryClient = useQueryClient();
  const walletQuery = useWalletQuery();
  const transactionsQuery = useTransactionsQuery(walletQuery.data?.id);
  const mutations = useWalletMutations(walletQuery.data?.id);

  useEffect(() => {
    // Subscribing to real-time updates for transactions
    const channel = supabase
      .channel('wallet_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'fit_transactions',
        filter: `wallet_id=eq.${walletQuery.data?.id}`
      }, async (payload) => {
        // Only notify if it's an incoming transfer (positive amount)
        if (payload.new.amount > 0 && payload.new.transaction_type === 'transfer') {
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});

          // Show toast notification
          toast.success('Transferência recebida!', {
            description: `Você recebeu ${payload.new.amount} FITs`
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      })
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletQuery.data?.id, queryClient]);

  return {
    wallet: walletQuery.data,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: mutations.addTransaction.mutate,
    createTransferQRCode: mutations.createQRCode.mutateAsync,
    redeemQRCode: mutations.redeemQRCode.mutate
  };
};
