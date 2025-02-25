
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';

type ProfileResult = {
  id: string;
}

type WalletResult = {
  id: string;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const result = await supabase
    .from('profiles')
    .select<string, ProfileResult>('id')
    .eq('email', email)
    .single();

  if (result.error) throw result.error;
  if (!result.data) {
    throw new Error('Usuário não encontrado');
  }
  
  return result.data.id;
}

export async function createWalletTransaction(params: {
  walletId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
}): Promise<void> {
  // Create transaction for sender (negative amount)
  const { error: senderError } = await supabase
    .from('fit_transactions')
    .insert({
      wallet_id: params.walletId,
      amount: -params.amount, // Negative amount for sender
      transaction_type: params.type,
      description: params.description,
      recipient_id: params.recipientId,
      qr_code_id: params.qrCodeId
    });

  if (senderError) throw senderError;

  // If there's a recipient, create transaction for them (positive amount)
  if (params.recipientId) {
    const result = await supabase
      .from('wallets')
      .select<string, WalletResult>('id')
      .eq('user_id', params.recipientId)
      .single();

    if (result.error) throw result.error;
    if (!result.data) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert({
        wallet_id: result.data.id,
        amount: params.amount, // Positive amount for recipient
        transaction_type: params.type,
        description: params.description || 'Transferência recebida',
        recipient_id: params.recipientId,
        qr_code_id: params.qrCodeId
      });

    if (recipientError) throw recipientError;
  }
}
