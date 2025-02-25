
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';

export async function findRecipientByEmail(email: string): Promise<string> {
  // First get user from auth.users through Supabase auth API
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) throw authError;
  
  const user = users?.find(u => u.email === email);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }
  
  return user.id;
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
    const { data: wallets, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', params.recipientId)
      .single();

    if (walletError) throw walletError;
    if (!wallets) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert({
        wallet_id: wallets.id,
        amount: params.amount, // Positive amount for recipient
        transaction_type: params.type,
        description: params.description || 'Transferência recebida',
        recipient_id: params.recipientId,
        qr_code_id: params.qrCodeId
      });

    if (recipientError) throw recipientError;
  }
}
