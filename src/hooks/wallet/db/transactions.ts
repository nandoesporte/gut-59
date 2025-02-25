
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';

export type CreateTransactionInput = {
  walletId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
};

interface Profile {
  id: string;
}

interface Wallet {
  id: string;
}

interface DbTransaction {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string | null;
  recipient_id?: string | null;
  qr_code_id?: string | null;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1);
  
  if (error) {
    throw new Error('Erro ao buscar usuário: ' + error.message);
  }
  
  if (!data?.[0]) {
    throw new Error('Usuário não encontrado');
  }

  return data[0].id;
}

export async function createWalletTransaction(input: CreateTransactionInput): Promise<void> {
  const senderTransaction: DbTransaction = {
    wallet_id: input.walletId,
    amount: -input.amount,
    transaction_type: input.type,
    description: input.description || null,
    recipient_id: input.recipientId || null,
    qr_code_id: input.qrCodeId || null
  };

  const { error: senderError } = await supabase
    .from('fit_transactions')
    .insert([senderTransaction]);

  if (senderError) {
    throw new Error('Erro ao criar transação do remetente: ' + senderError.message);
  }

  if (input.recipientId) {
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', input.recipientId)
      .limit(1);

    if (walletError || !walletData?.[0]) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const recipientTransaction: DbTransaction = {
      wallet_id: walletData[0].id,
      amount: input.amount,
      transaction_type: input.type,
      description: input.description || 'Transferência recebida',
      recipient_id: input.recipientId,
      qr_code_id: input.qrCodeId || null
    };

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert([recipientTransaction]);

    if (recipientError) {
      throw new Error('Erro ao criar transação do destinatário: ' + recipientError.message);
    }
  }
}
