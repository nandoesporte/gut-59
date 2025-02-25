
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/wallet';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Wallet = Database['public']['Tables']['wallets']['Row'];

interface TransactionInsert {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  recipient_id?: string;
  qr_code_id?: string;
}

export async function findRecipientByEmail(email: string): Promise<string> {
  const result = await supabase
    .from('profiles')
    .select<'id', Pick<Profile, 'id'>>('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();
  
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
    
    const result = await supabase
      .from('wallets')
      .select<'id', Pick<Wallet, 'id'>>('id')
      .eq('user_id', params.recipientId)
      .limit(1)
      .maybeSingle();

    if (result.error) {
      console.error('Erro ao buscar carteira do destinatário:', result.error);
      throw result.error;
    }

    if (!result.data) {
      console.error('Carteira do destinatário não encontrada');
      throw new Error('Carteira do destinatário não encontrada');
    }

    console.log('Carteira do destinatário encontrada:', result.data.id);

    const recipientTransactionData: TransactionInsert = {
      wallet_id: result.data.id,
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
