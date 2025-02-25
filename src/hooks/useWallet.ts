
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

// Basic type definitions without nesting
interface BaseTransaction {
  amount: number;
  type: TransactionType;
  description?: string;
}

interface TransactionInput extends BaseTransaction {
  recipientId?: string;
  recipientEmail?: string;
  qrCodeId?: string;
}

interface EmailTransferInput extends BaseTransaction {
  email: string;
}

interface QRCodeInput {
  amount: number;
}

export const useWallet = () => {
  const queryClient = useQueryClient();

  // Basic wallet query
  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { data: existingWallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!existingWallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, balance: 0 }])
          .select()
          .single();

        if (createError) throw createError;
        return newWallet as Wallet;
      }

      return existingWallet as Wallet;
    }
  });

  // Transactions query
  const transactionsQuery = useQuery({
    queryKey: ['transactions', walletQuery.data?.id],
    queryFn: async () => {
      if (!walletQuery.data?.id) throw new Error('No wallet found');

      const { data, error } = await supabase
        .from('fit_transactions')
        .select('*')
        .eq('wallet_id', walletQuery.data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!walletQuery.data?.id
  });

  // Basic mutation functions
  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletQuery.data) throw new Error('Wallet not initialized');

      let finalRecipientId = input.recipientId;

      if (input.recipientEmail) {
        const { data: recipientUser, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', input.recipientEmail)
          .maybeSingle();

        if (userError) throw userError;
        if (!recipientUser) throw new Error('Usuário não encontrado');
        
        finalRecipientId = recipientUser.id;
      }

      const { error } = await supabase
        .from('fit_transactions')
        .insert({
          wallet_id: walletQuery.data.id,
          amount: input.amount,
          transaction_type: input.type,
          description: input.description,
          recipient_id: finalRecipientId,
          qr_code_id: input.qrCodeId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const emailTransfer = useMutation({
    mutationFn: async ({ amount, email, description }: EmailTransferInput) => {
      if (!walletQuery.data?.balance || walletQuery.data.balance < amount) {
        throw new Error('Saldo insuficiente');
      }

      return addTransaction.mutateAsync({
        amount: -amount,
        type: 'transfer',
        description: description || 'Transferência por email',
        recipientEmail: email
      });
    }
  });

  const createQRCode = useMutation({
    mutationFn: async ({ amount }: QRCodeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('transfer_qr_codes')
        .insert({
          creator_id: user.id,
          amount,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as TransferQRCode;
    }
  });

  const redeemQRCode = useMutation({
    mutationFn: async (qrCodeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: qrCode, error: qrError } = await supabase
        .from('transfer_qr_codes')
        .select('*')
        .eq('id', qrCodeId)
        .is('used_at', null)
        .maybeSingle();

      if (qrError || !qrCode) throw new Error('QR Code inválido ou já utilizado');
      if (new Date(qrCode.expires_at) < new Date()) throw new Error('QR Code expirado');

      const { error: updateError } = await supabase
        .from('transfer_qr_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id
        })
        .eq('id', qrCodeId);

      if (updateError) throw updateError;

      await addTransaction.mutateAsync({
        amount: qrCode.amount,
        type: 'transfer',
        description: 'Transferência via QR Code',
        recipientId: qrCode.creator_id,
        qrCodeId: qrCode.id
      });

      return qrCode;
    },
    onSuccess: () => {
      toast.success('Transferência realizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  return {
    wallet: walletQuery.data,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: addTransaction.mutate,
    createTransferQRCode: createQRCode.mutateAsync,
    redeemQRCode: redeemQRCode.mutate,
    transferByEmail: emailTransfer.mutate
  };
};
