
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

// Simplified standalone types
type TransactionInput = {
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  qrCodeId?: string;
};

type EmailTransferInput = {
  amount: number;
  email: string;
  description?: string;
};

type QRCodeInput = {
  amount: number;
};

type Profile = {
  id: string;
  email: string;
};

// Separate DB operations using explicit types
async function findRecipientByEmail(email: string): Promise<string> {
  const result = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (result.error) throw result.error;
  if (!result.data) throw new Error('Usuário não encontrado');
  
  return result.data.id;
}

async function createWalletTransaction(
  walletId: string, 
  amount: number,
  type: TransactionType,
  description?: string,
  recipientId?: string,
  qrCodeId?: string
): Promise<void> {
  const { error } = await supabase
    .from('fit_transactions')
    .insert({
      wallet_id: walletId,
      amount,
      transaction_type: type,
      description,
      recipient_id: recipientId,
      qr_code_id: qrCodeId
    });

  if (error) throw error;
}

export const useWallet = () => {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;

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

  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletQuery.data?.id) throw new Error('Wallet not initialized');
      
      let finalRecipientId = input.recipientId;
      if (input.recipientEmail) {
        finalRecipientId = await findRecipientByEmail(input.recipientEmail);
      }

      await createWalletTransaction(
        walletQuery.data.id,
        input.amount,
        input.type,
        input.description,
        finalRecipientId,
        input.qrCodeId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const emailTransfer = useMutation({
    mutationFn: async (input: EmailTransferInput) => {
      if (!walletQuery.data?.id) throw new Error('Wallet not initialized');
      if (!walletQuery.data.balance || walletQuery.data.balance < input.amount) {
        throw new Error('Saldo insuficiente');
      }

      const recipientId = await findRecipientByEmail(input.email);
      await createWalletTransaction(
        walletQuery.data.id,
        -input.amount,
        'transfer',
        input.description || 'Transferência por email',
        recipientId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const createQRCode = useMutation({
    mutationFn: async (input: QRCodeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('transfer_qr_codes')
        .insert({
          creator_id: user.id,
          amount: input.amount,
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
      if (!walletQuery.data?.id) throw new Error('Wallet not initialized');
      
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

      await createWalletTransaction(
        walletQuery.data.id,
        qrCode.amount,
        'transfer',
        'Transferência via QR Code',
        qrCode.creator_id,
        qrCode.id
      );

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
