
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';
import { ProfileResponse } from './types';

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Usuário não encontrado');
  }
  
  return data[0].id;
}

export async function createWalletTransaction(params: {
  walletId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('fit_transactions')
    .insert({
      wallet_id: params.walletId,
      amount: params.amount,
      transaction_type: params.type,
      description: params.description,
      recipient_id: params.recipientId,
      qr_code_id: params.qrCodeId
    });

  if (error) throw error;
}
