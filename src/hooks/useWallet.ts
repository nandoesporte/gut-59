
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

// Simplified transaction parameters
type TransactionParams = {
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  qrCodeId?: string;
};

// Simplified transfer parameters
type EmailTransferInput = {
  amount: number;
  email: string;
  description?: string;
};

type QRCodeInput = {
  qrCodeId: string;
};

export const useWallet = () => {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: isLoadingWallet } = useQuery({
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

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) throw new Error('No wallet found');

      const { data, error } = await supabase
        .from('fit_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!wallet?.id
  });

  const addTransaction = useMutation({
    mutationFn: async (params: TransactionParams) => {
      if (!wallet) throw new Error('Wallet not initialized');

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
          wallet_id: wallet.id,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      console.error('Error adding transaction:', error);
      toast.error('Erro ao adicionar transação');
    }
  });

  const transferByEmail = useMutation({
    mutationFn: async ({ amount, email, description }: EmailTransferInput) => {
      if (!amount || amount <= 0) throw new Error('Valor inválido');
      if (!email) throw new Error('Email do destinatário é obrigatório');
      if (!wallet || wallet.balance < amount) throw new Error('Saldo insuficiente');

      await addTransaction.mutateAsync({
        amount: -amount,
        type: 'transfer',
        description: description || 'Transferência por email',
        recipientEmail: email
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao realizar transferência');
    }
  });

  const createTransferQRCode = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!amount || amount <= 0) throw new Error('Valor inválido');

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
    mutationFn: async ({ qrCodeId }: QRCodeInput) => {
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
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao processar transferência');
    }
  });

  return {
    wallet,
    transactions,
    isLoading: isLoadingWallet || isLoadingTransactions,
    addTransaction: addTransaction.mutate,
    createTransferQRCode: createTransferQRCode.mutateAsync,
    redeemQRCode: redeemQRCode.mutate,
    transferByEmail: transferByEmail.mutate
  };
};
