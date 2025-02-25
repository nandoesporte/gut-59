
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Usuário não encontrado');
  }
  
  return data.id;
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
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', params.recipientId)
      .single();

    if (!recipientWallet) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert({
        wallet_id: recipientWallet.id,
        amount: params.amount, // Positive amount for recipient
        transaction_type: params.type,
        description: params.description || 'Transferência recebida',
        recipient_id: params.recipientId,
        qr_code_id: params.qrCodeId
      });

    if (recipientError) throw recipientError;
  }
}
