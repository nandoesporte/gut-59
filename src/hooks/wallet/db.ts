
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Wallet = Database['public']['Tables']['wallets']['Row'];

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();
  
  if (usersError) throw usersError;
  if (!usersData) {
    throw new Error('Usuário não encontrado');
  }
  
  return usersData.id;
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

  if (senderError) {
    console.error('Erro ao criar transação do remetente:', senderError);
    throw senderError;
  }

  // If there's a recipient, create transaction for them (positive amount)
  if (params.recipientId) {
    console.log('Buscando carteira do destinatário:', params.recipientId);
    
    const { data: recipientWallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', params.recipientId)
      .maybeSingle();

    if (walletError) {
      console.error('Erro ao buscar carteira do destinatário:', walletError);
      throw walletError;
    }

    if (!recipientWallet) {
      console.error('Carteira do destinatário não encontrada');
      throw new Error('Carteira do destinatário não encontrada');
    }

    console.log('Carteira do destinatário encontrada:', recipientWallet.id);

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

    if (recipientError) {
      console.error('Erro ao criar transação do destinatário:', recipientError);
      throw recipientError;
    }

    console.log('Transação criada com sucesso para ambas as partes');
  }
}
