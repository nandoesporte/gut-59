
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

// Simplified type definitions
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

export const useWallet = () => {
  const queryClient = useQueryClient();

  // Query para buscar a carteira
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

  // Query para buscar transações
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

  // Função auxiliar para criar transação
  const createTransaction = async (input: TransactionInput) => {
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

    await supabase
      .from('fit_transactions')
      .insert({
        wallet_id: walletQuery.data.id,
        amount: input.amount,
        transaction_type: input.type,
        description: input.description,
        recipient_id: finalRecipientId,
        qr_code_id: input.qrCodeId
      });
  };

  // Mutation simplificada para adicionar transação
  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      await createTransaction(input);
      
      if (input.type !== 'transfer') {
        toast.success(`Parabéns! Você ganhou ${input.amount} FITs!`, {
          description: input.description || 'Continue assim!',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  // Mutation simplificada para transferência por email
  const emailTransfer = useMutation({
    mutationFn: async (input: EmailTransferInput) => {
      if (!walletQuery.data?.balance || walletQuery.data.balance < input.amount) {
        throw new Error('Saldo insuficiente');
      }

      await createTransaction({
        amount: -input.amount,
        type: 'transfer',
        description: input.description || 'Transferência por email',
        recipientEmail: input.email
      });
    }
  });

  // Mutation simplificada para criar QR Code
  const createQRCode = useMutation({
    mutationFn: async (amount: number) => {
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

  // Mutation simplificada para resgatar QR Code
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

      await supabase
        .from('transfer_qr_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id
        })
        .eq('id', qrCodeId);

      await createTransaction({
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
