
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Wallet } from '@/types/wallet';

export function useWalletQuery() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, balance: 0 }])
          .select()
          .single();

        if (createError) throw createError;
        return {
          ...newWallet,
          balance: Math.max(0, newWallet.balance)
        } as Wallet;
      }

      return {
        ...wallet,
        balance: Math.max(0, wallet.balance)
      } as Wallet;
    }
  });
}

export function useTransactionsQuery(walletId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', walletId],
    queryFn: async () => {
      if (!walletId) throw new Error('No wallet found');

      const { data } = await supabase
        .from('fit_transactions')
        .select(`
          *,
          sender_profile:profiles!fit_transactions_wallet_id_fkey(email),
          recipient_profile:profiles!fit_transactions_recipient_id_fkey(email)
        `)
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      return (data || []) as (Transaction & {
        sender_profile: { email: string } | null;
        recipient_profile: { email: string } | null;
      })[];
    },
    enabled: !!walletId
  });
}
