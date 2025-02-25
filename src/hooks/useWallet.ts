
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

// Tipos simplificados sem herança ou recursão
type SimpleTransactionParams = {
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  qrCodeId?: string;
};

type SimpleEmailTransfer = {
  amount: number;
  email: string;
  description?: string;
};

type SimpleQRCodeParams = {
  amount: number;
};

type SimpleRedeemParams = {
  qrCodeId: string;
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

  // Mutation para criar transação
  const addTransactionMutation = useMutation({
    mutationFn: async (params: SimpleTransactionParams) => {
      if (!walletQuery.data) throw new Error('Wallet not initialized');

      let finalRecipientId = params.recipientId;

      if (params.recipientEmail) {
        const { data: recipientUser, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', params.recipientEmail)
          .maybeSingle();

        if (userError) throw userError;
        if (!recipientUser) throw new Error('Usuário não encontrado');
        
        finalRecipientId = recipientUser.id;
      }

      const { error: transactionError } = await supabase
        .from('fit_transactions')
        .insert({
          wallet_id: walletQuery.data.id,
          amount: params.amount,
          transaction_type: params.type,
          description: params.description,
          recipient_id: finalRecipientId,
          qr_code_id: params.qrCodeId
        });

      if (transactionError) throw transactionError;

      if (params.type !== 'transfer') {
        toast.success(`Parabéns! Você ganhou ${params.amount} FITs!`, {
          description: params.description || 'Continue assim!',
        });
      }
    }
  });

  // Mutation para transferência por email
  const emailTransferMutation = useMutation({
    mutationFn: async (params: SimpleEmailTransfer) => {
      if (!walletQuery.data?.balance || walletQuery.data.balance < params.amount) {
        throw new Error('Saldo insuficiente');
      }

      await addTransactionMutation.mutateAsync({
        amount: -params.amount,
        type: 'transfer',
        description: params.description || 'Transferência por email',
        recipientEmail: params.email
      });
    }
  });

  // Mutation para criar QR Code
  const createQRCodeMutation = useMutation({
    mutationFn: async (params: SimpleQRCodeParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('transfer_qr_codes')
        .insert({
          creator_id: user.id,
          amount: params.amount,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as TransferQRCode;
    }
  });

  // Mutation para resgatar QR Code
  const redeemQRCodeMutation = useMutation({
    mutationFn: async (params: SimpleRedeemParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: qrCode, error: qrError } = await supabase
        .from('transfer_qr_codes')
        .select('*')
        .eq('id', params.qrCodeId)
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
        .eq('id', params.qrCodeId);

      await addTransactionMutation.mutateAsync({
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
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao processar transferência');
    }
  });

  return {
    wallet: walletQuery.data,
    transactions: transactionsQuery.data,
    isLoading: walletQuery.isLoading || transactionsQuery.isLoading,
    addTransaction: addTransactionMutation.mutate,
    createTransferQRCode: createQRCodeMutation.mutateAsync,
    redeemQRCode: redeemQRCodeMutation.mutate,
    transferByEmail: emailTransferMutation.mutate
  };
};
