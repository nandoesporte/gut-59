
import { supabase } from '@/integrations/supabase/client';
import type { TransactionType } from '@/types/wallet';

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  
  if (error) {
    throw new Error('Erro ao buscar usuário: ' + error.message);
  }
  
  if (!data) {
    throw new Error('Usuário não encontrado');
  }

  return data.id;
}

type CreateTransactionInput = {
  walletId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
};

type DbTransaction = {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  recipient_id?: string;
  qr_code_id?: string;
};

export async function createWalletTransaction(input: CreateTransactionInput): Promise<void> {
  const senderTransaction: DbTransaction = {
    wallet_id: input.walletId,
    amount: -input.amount,
    transaction_type: input.type,
    description: input.description,
    recipient_id: input.recipientId,
    qr_code_id: input.qrCodeId
  };

  const { error: senderError } = await supabase
    .from('fit_transactions')
    .insert([senderTransaction]);

  if (senderError) {
    throw new Error('Erro ao criar transação do remetente: ' + senderError.message);
  }

  if (input.recipientId) {
    const { data: recipientWallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', input.recipientId)
      .single();

    if (walletError || !recipientWallet) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const recipientTransaction: DbTransaction = {
      wallet_id: recipientWallet.id,
      amount: input.amount,
      transaction_type: input.type,
      description: input.description || 'Transferência recebida',
      recipient_id: input.recipientId,
      qr_code_id: input.qrCodeId
    };

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert([recipientTransaction]);

    if (recipientError) {
      throw new Error('Erro ao criar transação do destinatário: ' + recipientError.message);
    }
  }
}
