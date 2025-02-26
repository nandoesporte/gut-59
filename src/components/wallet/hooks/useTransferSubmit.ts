
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TransferFormValues } from '../schemas/transfer-schema';
import { UseFormReset } from 'react-hook-form';

export function useTransferSubmit(formReset: UseFormReset<TransferFormValues>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async (values: TransferFormValues) => {
    try {
      setIsLoading(true);
      toast.info('Iniciando transferência...', { duration: 1000 });
      console.log('Starting transfer process with values:', values);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Auth error:', userError);
        toast.error('Erro de autenticação', { duration: 3000 });
        return;
      }
      if (!user) {
        toast.error('Usuário não autenticado', { duration: 3000 });
        return;
      }
      console.log('Current user:', user.id);

      // Get the sender's wallet
      const { data: senderWallet, error: senderWalletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Sender wallet query result:', { senderWallet, senderWalletError });

      if (senderWalletError) {
        console.error('Sender wallet error:', senderWalletError);
        toast.error('Erro ao acessar sua carteira', { duration: 3000 });
        return;
      }

      if (!senderWallet) {
        toast.error('Você ainda não possui uma carteira', { duration: 3000 });
        return;
      }

      // Verify if sender has enough balance
      if (senderWallet.balance < values.amount) {
        console.log('Insufficient balance:', { balance: senderWallet.balance, requested: values.amount });
        toast.error('Saldo insuficiente para realizar a transferência', { duration: 3000 });
        return;
      }

      // First get the recipient's profile by email
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', values.recipientEmail)
        .maybeSingle();

      console.log('Recipient profile query result:', { recipientProfile, profileError });

      if (profileError) {
        console.error('Profile error:', profileError);
        toast.error('Erro ao buscar destinatário', { duration: 3000 });
        return;
      }

      if (!recipientProfile) {
        toast.error('Destinatário não encontrado', { duration: 3000 });
        return;
      }

      // Prevent self-transfer
      if (recipientProfile.id === user.id) {
        toast.error('Você não pode transferir FITs para você mesmo', { duration: 3000 });
        return;
      }

      // Get the recipient's wallet
      const { data: recipientWallet, error: recipientWalletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .maybeSingle();

      console.log('Recipient wallet query result:', { recipientWallet, recipientWalletError });

      if (recipientWalletError) {
        console.error('Recipient wallet error:', recipientWalletError);
        toast.error('Erro ao acessar carteira do destinatário', { duration: 3000 });
        return;
      }

      if (!recipientWallet) {
        toast.error('O destinatário ainda não possui uma carteira', { duration: 3000 });
        return;
      }

      const transferParams = {
        sender_wallet_id: user.id,
        recipient_wallet_id: recipientProfile.id,
        transfer_amount: values.amount,
        description: values.description || 'Transferência de FITs'
      };
      
      console.log('Calling process_transfer with params:', transferParams);

      // Process the transfer using the RPC function
      const { data: transferData, error: transferError } = await supabase.rpc(
        'process_transfer',
        transferParams
      );

      console.log('Transfer result:', { transferData, transferError });

      if (transferError) {
        console.error('Transfer error:', transferError);
        if (transferError.message.includes('not enough balance')) {
          toast.error('Saldo insuficiente para realizar a transferência', { duration: 3000 });
        } else {
          toast.error('Erro ao realizar transferência', { duration: 3000 });
        }
        return;
      }

      formReset();
      toast.success('Transferência realizada com sucesso!', { duration: 3000 });
    } catch (error) {
      console.error('Error during transfer:', error);
      toast.error('Erro ao realizar transferência', { duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleTransfer
  };
}
