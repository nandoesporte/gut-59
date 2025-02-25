
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TransferQRCode } from '@/types/wallet';
import { toast } from 'sonner';
import { TransactionInput, EmailTransferInput, QRCodeInput } from './types';
import { findRecipientByEmail, createWalletTransaction } from './db';

export function useWalletMutations(walletId: string | undefined) {
  const queryClient = useQueryClient();

  const addTransaction = useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!walletId) throw new Error('Wallet not initialized');
      
      let finalRecipientId = input.recipientId;
      if (input.recipientEmail) {
        finalRecipientId = await findRecipientByEmail(input.recipientEmail);
      }

      await createWalletTransaction({
        walletId,
        amount: input.amount,
        type: input.type,
        description: input.description,
        recipientId: finalRecipientId,
        qrCodeId: input.qrCodeId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const emailTransfer = useMutation({
    mutationFn: async (input: EmailTransferInput) => {
      if (!walletId) throw new Error('Wallet not initialized');

      const recipientId = await findRecipientByEmail(input.email);
      await createWalletTransaction({
        walletId,
        amount: -input.amount,
        type: 'transfer',
        description: input.description || 'Transferência por email',
        recipientId
      });
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
      if (!walletId) throw new Error('Wallet not initialized');
      
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

      await createWalletTransaction({
        walletId,
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
    addTransaction,
    emailTransfer,
    createQRCode,
    redeemQRCode
  };
}
