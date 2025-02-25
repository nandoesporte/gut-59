
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
        return newWallet as Wallet;
      }

      return wallet as Wallet;
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
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      return data as Transaction[];
    },
    enabled: !!walletId
  });
}
