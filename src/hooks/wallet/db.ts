
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';

interface TransactionInsert {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  recipient_id?: string;
  qr_code_id?: string;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id')
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
  const transactionData: TransactionInsert = {
    wallet_id: params.walletId,
    amount: -params.amount,
    transaction_type: params.type,
    description: params.description,
    recipient_id: params.recipientId,
    qr_code_id: params.qrCodeId
  };

  const { error: senderError } = await supabase
    .from('fit_transactions')
    .insert(transactionData);

  if (senderError) {
    console.error('Erro ao criar transação do remetente:', senderError);
    throw senderError;
  }

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

    const recipientTransactionData: TransactionInsert = {
      wallet_id: recipientWallet.id,
      amount: params.amount,
      transaction_type: params.type,
      description: params.description || 'Transferência recebida',
      recipient_id: params.recipientId,
      qr_code_id: params.qrCodeId
    };

    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert(recipientTransactionData);

    if (recipientError) {
      console.error('Erro ao criar transação do destinatário:', recipientError);
      throw recipientError;
    }

    console.log('Transação criada com sucesso para ambas as partes');
  }
}
