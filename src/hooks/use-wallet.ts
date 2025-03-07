
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserWallet = () => {
  const [wallet, setWallet] = useState<{ balance: number, id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const { data, error } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        setWallet(data);
      } catch (err) {
        console.error('Error fetching wallet:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchWallet();
  }, []);

  return { wallet, loading, error };
};
