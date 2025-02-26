
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

type DbTransaction = {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string | null;
  recipient_id?: string | null;
  qr_code_id?: string | null;
}

export async function createWalletTransaction(input: CreateTransactionInput): Promise<void> {
  const transaction: DbTransaction = {
    wallet_id: input.walletId,
    amount: input.amount,
    transaction_type: input.type,
    description: input.description || null,
    recipient_id: input.recipientId || null,
    qr_code_id: input.qrCodeId || null
  };

  console.log('Criando transação com valores:', transaction);

  const { error } = await supabase
    .from('fit_transactions')
    .insert(transaction);

  if (error) {
    console.error('Erro na transação:', error);
    throw new Error('Error creating transaction: ' + error.message);
  }

  console.log('Transação criada com sucesso');
}
