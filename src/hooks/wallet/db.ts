
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

interface ProfileResult {
  id: string;
}

interface WalletResult {
  id: string;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single() as { data: ProfileResult | null; error: any };
  
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
    
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', params.recipientId)
      .limit(1)
      .single() as { data: WalletResult | null; error: any };

    if (walletError) {
      console.error('Erro ao buscar carteira do destinatário:', walletError);
      throw walletError;
    }

    if (!wallet) {
      console.error('Carteira do destinatário não encontrada');
      throw new Error('Carteira do destinatário não encontrada');
    }

    console.log('Carteira do destinatário encontrada:', wallet.id);

    const recipientTransactionData: TransactionInsert = {
      wallet_id: wallet.id,
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
