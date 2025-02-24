
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType, Wallet, TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';

export const useWallet = () => {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: isLoadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .single();

      if (error) throw error;
      return data as Wallet;
    },
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fit_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const addTransaction = useMutation({
    mutationFn: async ({ 
      amount, 
      type, 
      description,
      recipientId,
      qrCodeId 
    }: { 
      amount: number; 
      type: TransactionType; 
      description?: string;
      recipientId?: string;
      qrCodeId?: string;
    }) => {
      if (!wallet) throw new Error('Wallet not found');

      const { error } = await supabase
        .from('fit_transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          transaction_type: type,
          description,
          recipient_id: recipientId,
          qr_code_id: qrCodeId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error adding transaction:', error);
      toast.error('Erro ao adicionar transação');
    }
  });

  const createTransferQRCode = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // QR Code expires in 24 hours

      const { data, error } = await supabase
        .from('transfer_qr_codes')
        .insert({
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
    mutationFn: async ({ qrCodeId }: { qrCodeId: string }) => {
      const { data: qrCode, error: qrError } = await supabase
        .from('transfer_qr_codes')
        .select('*')
        .eq('id', qrCodeId)
        .is('used_at', null)
        .single();

      if (qrError || !qrCode) throw new Error('QR Code inválido ou já utilizado');

      const now = new Date();
      if (new Date(qrCode.expires_at) < now) {
        throw new Error('QR Code expirado');
      }

      // Mark QR code as used
      const { error: updateError } = await supabase
        .from('transfer_qr_codes')
        .update({
          used_at: now.toISOString(),
          used_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', qrCodeId);

      if (updateError) throw updateError;

      // Create the transfer transaction
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
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar transferência');
    }
  });

  return {
    wallet,
    transactions,
    isLoading: isLoadingWallet || isLoadingTransactions,
    addTransaction: addTransaction.mutate,
    createTransferQRCode: createTransferQRCode.mutate,
    redeemQRCode: redeemQRCode.mutate
  };
};
