
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

type ProfileResponse = {
  id: string;
}

type WalletResponse = {
  id: string;
}

type DbTransaction = {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string | null;
  recipient_id?: string | null;
  qr_code_id?: string | null;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const result = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .returns<ProfileResponse[]>();
  
  if (result.error) {
    throw new Error('Erro ao buscar usuário: ' + result.error.message);
  }
  
  if (!result.data?.[0]) {
    throw new Error('Usuário não encontrado');
  }

  return result.data[0].id;
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
    const result = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', input.recipientId)
      .limit(1)
      .returns<WalletResponse[]>();

    if (result.error || !result.data?.[0]) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const recipientTransaction: DbTransaction = {
      wallet_id: result.data[0].id,
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
